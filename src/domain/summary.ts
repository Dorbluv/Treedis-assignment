import type { CauseItem, MaintenanceRecord, RetrievalResult } from './types';

/**
 * Rules for the evidence summary. The model only rephrases records retrieval already chose.
 * These checks are heuristics: they cannot prove that an excerpt supports its sentence.
 */

export interface SummarySentence {
  text: string;
  citations: string[];
}

export type SummaryResponse =
  | { source: 'gemini'; sentences: SummarySentence[] }
  | { source: 'prepared'; sentences: SummarySentence[]; reason?: string }
  | { source: 'none' };

export const MAX_SENTENCES = 2;
export const MAX_SENTENCE_CHARS = 110;
export const INSUFFICIENT_SENTENCE = 'Insufficient asset-specific evidence to recommend a likely cause.';

export type SummaryRule = 'shape' | 'citation' | 'number' | 'diagnosis' | 'cause' | 'instruction' | 'insufficient' | 'limit_label' | 'cause_coverage' | 'restates_reading';

export interface ValidationFailure {
  rule: SummaryRule;
  detail: string;
}

export type ValidationResult =
  | { ok: true; sentences: SummarySentence[] }
  | { ok: false; failures: ValidationFailure[] };

/** Words that name each known cause. A cause is only allowed if retrieval lists it for this asset. */
const CAUSE_TERMS: Record<string, RegExp> = {
  bearing_wear: /\b(wear|worn)\b/i,
  lubrication: /\b(lubric\w*|grease\w*)\b/i,
  nozzle_blockage: /\b(block\w*|clog\w*|obstruct\w*)\b/i,
};

const OTHER_CAUSES =
  /\b(misalign\w*|alignment|seals?|leak\w*|imbalance|unbalance\w*|loose\w*|corro\w*|cavitation|overload\w*|overheat\w*|electrical fault|winding\w*|short circuit|fatigue|crack\w*|contaminat\w*|resonance|soft foot|rotor|stator)\b/i;

const CAUSE_INTRO =
  /\b(?:caused by|causes? (?:was|may be|could be|might be)|due to|because of|points? to|pointing to|indicat\w*|suggest\w*|results? (?:of|from)|attributed to|traced to|linked to)\s+([^.;]+)/gi;
const MEASUREMENT = /\b(vibration|temperature|current|pressure|readings?|limits?|evidence|above|below|within)\b/i;

const DIAGNOSIS =
  /\b(confirm(?:s|ed)?|diagnos\w*|definitely|certainly|clearly|undoubtedly|root cause|the cause is|must be|proves?|proven)\b|\b(?:is|are)\s+(?:due to|caused by|the cause|worn|blocked|clogged|failing|failed|damaged)\b/i;
const NEGATED_CONFIRMED = /\b(?:not|never|neither|nor|none|no|cannot|can't)\b[^.;]*?\bconfirm(?:s|ed)?\b/gi;
const HEDGE = /\b(possible|possibly|may|might|could|past|previous|previously|earlier|before|history|unconfirmed|neither|none|not confirmed|incidents?|records?)\b|\bin (?:\w+ )?\d{4}\b/i;

const INSTRUCTION =
  /\b(should|must|needs? to|have to|has to|recommend\w*|ensure|make sure|next step|lock(?:ing)? out|lockout|steps? \d+|steps? (?:one|two|three|four|five)|inspect)\b|\b(?:check|replace|tighten|clean|measure|verify)\s+the\b/i;
const IMPERATIVE_START =
  /^\s*(?:please\s+)?(check|inspect|lock|turn|replace|tighten|verify|measure|isolate|top up|stop|shut|remove|clean|apply|perform|follow|escalate|repair|use|open|feel|look|test|examine|lubricate|grease|align|confirm|investigate|review|schedule|call|contact|do)\b/i;

const UNLABELED_LIMIT = /(?<!\bdemo\s)(?<!\bdemonstration\s)\blimits?\b/i;

const RECORD_OR_ASSET_ID = /\b[A-Z]{1,4}-[A-Z]?\d+(?:-[A-Z0-9]+)*\b/g;
const DIGITS = /\d+(?:[.,]\d+)?/g;
const NUMBER_WORDS = /\b(two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twice|dozen|half)\b/gi;

function termsFor(cause: CauseItem): RegExp {
  return CAUSE_TERMS[cause.key] ?? new RegExp(`\\b${cause.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
}

function normalizeNumber(value: string): string {
  return String(Number(value.replace(',', '.')));
}

function numbersIn(text: string): string[] {
  return (text.replace(RECORD_OR_ASSET_ID, ' ').match(DIGITS) ?? []).map(normalizeNumber);
}

/** Indented so that array values never read as one decimal, such as "78,79". */
function recordText(record: MaintenanceRecord): string {
  return JSON.stringify(record, null, 1);
}

/** Words that add nothing beyond a reading and its limit. */
const READING_FILLER = new Set(
  'a an the is are was were at of on in to for with and or by its their it this that these those has have had now currently still remains against reached reaching reads reading readings value values above below within over under exceeds exceeded exceeding high higher low elevated demo demonstration limit limits motor machine filler housing bank velocity rms degrees celsius'.split(' '),
);

function onlyRestatesReading(text: string, result: RetrievalResult): boolean {
  const readings = result.included.flatMap((item) => item.record.readings ?? []);
  if (readings.length === 0) return false;
  const words = new Set(readings.flatMap((reading) => `${reading.label} ${reading.unit}`.toLowerCase().match(/\p{L}+/gu) ?? []));
  const numbers = new Set(readings.flatMap((reading) => [String(reading.value), String(reading.limit)]));
  const tokens = text.replace(RECORD_OR_ASSET_ID, ' ').toLowerCase().match(/\p{L}+|\d+(?:[.,]\d+)?/gu) ?? [];
  const isReadingRef = (token: string) => words.has(token) || numbers.has(/\d/.test(token) ? normalizeNumber(token) : token);
  return tokens.some(isReadingRef) && tokens.every((token) => isReadingRef(token) || READING_FILLER.has(token));
}

function checkSentence(sentence: SummarySentence, result: RetrievalResult): ValidationFailure[] {
  const failures: ValidationFailure[] = [];
  const { text, citations } = sentence;
  const included = new Map(result.included.map((item) => [item.record.id, item.record]));

  const bad = citations.filter((id) => !included.has(id));
  if (bad.length > 0) failures.push({ rule: 'citation', detail: `not in this machine's evidence: ${bad.join(', ')}` });

  const cited = citations.flatMap((id) => (included.has(id) ? [recordText(included.get(id) as MaintenanceRecord)] : []));
  const citedNumbers = new Set(cited.flatMap(numbersIn));
  const citedText = cited.join(' ').toLowerCase();
  for (const number of numbersIn(text)) {
    if (!citedNumbers.has(number)) failures.push({ rule: 'number', detail: `${number} is in no cited record` });
  }
  for (const word of text.match(NUMBER_WORDS) ?? []) {
    if (!new RegExp(`\\b${word}\\b`, 'i').test(citedText)) failures.push({ rule: 'number', detail: `"${word}" is in no cited record` });
  }

  if (onlyRestatesReading(text, result)) failures.push({ rule: 'restates_reading', detail: 'only restates a reading the screen already shows' });

  if (UNLABELED_LIMIT.test(text)) failures.push({ rule: 'limit_label', detail: 'a limit must be called a demo limit' });

  if (DIAGNOSIS.test(text.replace(NEGATED_CONFIRMED, ' '))) failures.push({ rule: 'diagnosis', detail: 'states a confirmed cause or diagnosis' });

  if (INSTRUCTION.test(text.replace(/recommend a likely cause/gi, ' ')) || IMPERATIVE_START.test(text)) failures.push({ rule: 'instruction', detail: 'contains an instruction or inspection step' });

  const allowed = result.possibleCauses;
  const allowedTerms = allowed.map(termsFor);
  const forbidden = [OTHER_CAUSES, ...Object.entries(CAUSE_TERMS).filter(([key]) => !allowed.some((cause) => cause.key === key)).map(([, terms]) => terms)];
  if (forbidden.some((terms) => terms.test(text))) failures.push({ rule: 'cause', detail: 'names a cause outside the allowed list' });

  for (const match of text.matchAll(CAUSE_INTRO)) {
    if (!allowedTerms.some((terms) => terms.test(match[1])) && !MEASUREMENT.test(match[1])) {
      failures.push({ rule: 'cause', detail: 'attributes the alert to something outside the allowed list' });
    }
  }

  const named = allowed.filter((cause) => termsFor(cause).test(text));
  for (const cause of named) {
    if (!citations.includes(cause.recordId)) failures.push({ rule: 'citation', detail: `${cause.label} needs its own record cited` });
  }
  if (named.length > 0 && !HEDGE.test(text)) failures.push({ rule: 'diagnosis', detail: 'names a cause without marking it as possible or past' });

  return failures;
}

function isSentence(value: unknown): value is SummarySentence {
  const candidate = value as SummarySentence;
  return (
    typeof candidate === 'object' &&
    candidate !== null &&
    typeof candidate.text === 'string' &&
    candidate.text.trim().length > 0 &&
    Array.isArray(candidate.citations) &&
    candidate.citations.length > 0 &&
    candidate.citations.every((id) => typeof id === 'string')
  );
}

/** Nothing reaches the screen unless every rule here passes. */
export function validateSummary(raw: unknown, result: RetrievalResult): ValidationResult {
  const list = (raw as { sentences?: unknown } | null)?.sentences;
  if (!Array.isArray(list) || list.length === 0 || list.length > MAX_SENTENCES || !list.every(isSentence)) {
    return { ok: false, failures: [{ rule: 'shape', detail: `needs 1 to ${MAX_SENTENCES} sentences, each with citations` }] };
  }

  const sentences = (list as SummarySentence[]).map((item) => ({ text: item.text.trim(), citations: [...new Set(item.citations)] }));
  const failures: ValidationFailure[] = [];
  for (const sentence of sentences) {
    if (sentence.text.length > MAX_SENTENCE_CHARS) failures.push({ rule: 'shape', detail: 'sentence is too long' });
    if (/[.!?]\s+[A-Z]/.test(sentence.text)) failures.push({ rule: 'shape', detail: 'one entry holds more than one sentence' });
    failures.push(...checkSentence(sentence, result));
  }

  // Naming only some causes reads as ranking them.
  const namedCauses = result.possibleCauses.filter((cause) => sentences.some((sentence) => termsFor(cause).test(sentence.text)));
  if (namedCauses.length > 0 && namedCauses.length < result.possibleCauses.length) {
    failures.push({ rule: 'cause_coverage', detail: 'names some allowed causes but not all' });
  }

  if (result.possibleCauses.length === 0 && !sentences.some((sentence) => /\binsufficient\b/i.test(sentence.text))) {
    failures.push({ rule: 'insufficient', detail: 'must state that evidence is insufficient' });
  }

  return failures.length > 0 ? { ok: false, failures } : { ok: true, sentences };
}

/** The deterministic summary, built only from retrieval. It needs no model and repeats no readings. */
export function preparedSummary(result: RetrievalResult): SummarySentence[] {
  const causes = result.possibleCauses;
  if (causes.length === 0) {
    const citations = result.included.filter((item) => item.record.kind === 'sensor' || item.record.kind === 'sop').map((item) => item.record.id);
    return [
      { text: INSUFFICIENT_SENTENCE, citations },
      { text: 'The records hold no past incident for this machine.', citations },
    ];
  }

  const citations = causes.map((cause) => cause.recordId);
  const labels = causes.map((cause) => cause.label.toLowerCase()).join(', ');
  if (causes.length === 1) {
    return [
      { text: `A past record lists one possible cause: ${labels}.`, citations },
      { text: 'It cannot show whether that applies to the current fault.', citations },
    ];
  }
  return [
    { text: `Past records list different possible causes: ${labels}.`, citations },
    { text: 'They cannot show which, if either, applies to the current fault.', citations },
  ];
}
