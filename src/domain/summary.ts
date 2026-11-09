import { readingStatus } from './causes';
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

export const MAX_SENTENCES = 3;
export const MAX_SENTENCE_CHARS = 110;
export const INSUFFICIENT_SENTENCE = 'Insufficient asset-specific evidence to recommend a likely cause.';

export type SummaryRule = 'shape' | 'citation' | 'number' | 'diagnosis' | 'cause' | 'instruction' | 'insufficient';

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
const NEGATED_CONFIRMED = /\b(?:not|never|neither|nor|none|no)\b[^.;]*?\bconfirmed\b/gi;
const HEDGE = /\b(possible|possibly|may|might|could|past|previous|previously|earlier|before|history|unconfirmed|neither|none|not confirmed|incidents?|records?)\b|\bin (?:\w+ )?\d{4}\b/i;

const INSTRUCTION =
  /\b(should|must|needs? to|have to|has to|recommend\w*|ensure|make sure|next step|lock(?:ing)? out|lockout|steps? \d+|steps? (?:one|two|three|four|five)|inspect)\b|\b(?:check|replace|tighten|clean|measure|verify)\s+the\b/i;
const IMPERATIVE_START =
  /^\s*(?:please\s+)?(check|inspect|lock|turn|replace|tighten|verify|measure|isolate|top up|stop|shut|remove|clean|apply|perform|follow|escalate|repair|use|open|feel|look|test|examine|lubricate|grease|align|confirm|investigate|review|schedule|call|contact|do)\b/i;

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

  if (result.possibleCauses.length === 0 && !sentences.some((sentence) => /\binsufficient\b/i.test(sentence.text))) {
    failures.push({ rule: 'insufficient', detail: 'must state that evidence is insufficient' });
  }

  return failures.length > 0 ? { ok: false, failures } : { ok: true, sentences };
}

function joinLabels(labels: string[]): string {
  return labels.length > 1 ? `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}` : labels[0];
}

/** The deterministic summary, built only from retrieval. It needs no model. */
export function preparedSummary(result: RetrievalResult): SummarySentence[] {
  const sensor = result.included.find((item) => item.record.kind === 'sensor')?.record;
  const above = (sensor?.readings ?? []).filter((reading) => readingStatus(reading) === 'above').slice(0, 2);
  const sentences: SummarySentence[] = [];

  if (sensor && above.length > 0) {
    const parts = above.map((reading, index) => {
      const label = index === 0 ? reading.label : reading.label.toLowerCase();
      return `${label} is ${reading.value} ${reading.unit} (demo limit ${reading.limit})`;
    });
    sentences.push({ text: `${joinLabels(parts)}.`, citations: [sensor.id] });
  }

  const causes = result.possibleCauses;
  if (causes.length === 0) {
    const citations = result.included.filter((item) => item.record.kind === 'sensor' || item.record.kind === 'sop').map((item) => item.record.id);
    sentences.push({ text: INSUFFICIENT_SENTENCE, citations });
    return sentences;
  }

  const citations = causes.map((cause) => cause.recordId);
  const labels = causes.map((cause, index) => (index === 0 ? cause.label : cause.label.toLowerCase()));
  const possible = causes.length === 1 ? 'a possible cause' : 'possible causes';
  sentences.push({ text: `Past records list ${joinLabels(labels).toLowerCase()} as ${possible}.`, citations });
  sentences.push({ text: causes.length === 1 ? 'It is not confirmed.' : 'Neither is confirmed.', citations });
  return sentences;
}
