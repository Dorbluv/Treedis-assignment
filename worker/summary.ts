import { alertFor, assets, dataset } from '../src/data';
import { retrieve } from '../src/domain/retrieve';
import { MAX_SENTENCES, MAX_SENTENCE_CHARS, INSUFFICIENT_SENTENCE, preparedSummary, summaryAllowed, validateSummary, type SummaryResponse } from '../src/domain/summary';
import type { Alert, RetrievalResult } from '../src/domain/types';

/** Free tier, confirmed on Google's models and pricing pages on 2026-11-09. 3.8 and 3.6 Flash were overloaded in testing. */
export const MODEL = 'gemini-3.5-flash-lite';
export const PROMPT_VERSION = 'v5';
export const TIMEOUT_MS = 8000;
const GOOD_TTL_MS = 24 * 60 * 60 * 1000;
const FAILED_TTL_MS = 5 * 60 * 1000;

export interface SummaryEnv {
  GEMINI_API_KEY?: string;
}

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export interface SummaryCache {
  get(key: string): Promise<SummaryResponse | null>;
  put(key: string, value: SummaryResponse, ttlMs: number): Promise<void>;
}

export class ModelError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    sentences: {
      type: 'array',
      minItems: 1,
      maxItems: MAX_SENTENCES,
      items: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          citations: { type: 'array', minItems: 1, items: { type: 'string' } },
        },
        required: ['text', 'citations'],
      },
    },
  },
  required: ['sentences'],
};

export const SYSTEM_PROMPT = `You help a technician who has just received a machine alert. The screen already shows the readings, limits, dates, fixes and downtime. Do not repeat any of them.
Return at most ${MAX_SENTENCES} short English sentences, one per array item, each at most ${MAX_SENTENCE_CHARS} characters. Some records are in German: use their meaning, in English.

If allowed_causes is not empty:
- Sentence 1 says what the cited past records have in common or where they differ. It names every allowed cause, favors none, and uses the word "possible".
- Sentence 2 says what these records cannot tell the technician about the current fault.

If allowed_causes is empty:
- Sentence 1 must be exactly: "${INSUFFICIENT_SENTENCE}"
- Sentence 2 says what is missing from the records for this machine. Name no cause or fault.

Rules for every sentence:
- List in "citations" the IDs of the records that support it. A sentence naming a cause must cite that cause's record. Do not put record IDs in the text.
- Write no numbers, dates or counts.
- You never decide what is wrong now. Mention only causes in allowed_causes and no other cause or fault, including alignment. Never write traced to, caused by or due to.
- Give no instructions, inspection steps or advice about what anyone should do.
- Use correct singular and plural grammar. One cause is "a possible cause" and several are "possible causes". One record is "this record" and several are "these records". Verbs agree with their subjects.`;

/** Only records retrieval included for this asset. Procedure steps are withheld on purpose. */
export function buildUserPrompt(result: RetrievalResult, alert: Alert): string {
  return JSON.stringify({
    machine: result.asset.id,
    alert: alert.title,
    allowed_causes: result.possibleCauses.map((cause) => ({ cause: cause.label, record_id: cause.recordId })),
    records: result.included.map(({ record, label }) => ({
      id: record.id,
      relationship: label,
      kind: record.kind,
      language: record.language,
      summary: record.takeaway,
      original_excerpt: record.excerpt,
      english_explanation: record.englishExplanation,
      limitation: record.limitation,
      occurred_on: record.occurredOn,
      readings: record.readings?.map(({ label: name, value, unit, limit }) => ({ name, value, unit, demo_limit: limit })),
    })),
  });
}

/** Calls the model once and returns its parsed JSON. Errors carry a code and never the key. */
export async function askModel(result: RetrievalResult, alert: Alert, apiKey: string, fetchImpl: FetchLike): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: buildUserPrompt(result, alert) }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseJsonSchema: RESPONSE_SCHEMA,
        },
      }),
    });
    if (!response.ok) throw new ModelError(`http_${response.status}`);
    const body = (await response.json()) as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] };
    const text = (body.candidates?.[0]?.content?.parts ?? [])
      .filter((part) => !part.thought && part.text)
      .map((part) => part.text)
      .join('');
    if (!text) throw new ModelError('empty');
    try {
      return JSON.parse(text);
    } catch {
      throw new ModelError('bad_json');
    }
  } catch (error) {
    if (error instanceof ModelError) throw error;
    throw new ModelError(controller.signal.aborted ? 'timeout' : 'network');
  } finally {
    clearTimeout(timer);
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

/** Only codes are logged, never the key, the prompt or the model's text. */
function logFailure(assetId: string, code: string) {
  console.warn(`summary fallback asset=${assetId} code=${code}`);
}

async function summarize(result: RetrievalResult, alert: Alert, apiKey: string, fetchImpl: FetchLike): Promise<SummaryResponse> {
  const assetId = result.asset.id;
  try {
    const validated = validateSummary(await askModel(result, alert, apiKey, fetchImpl), result);
    if (validated.ok) return { source: 'gemini', sentences: validated.sentences };
    const rules = [...new Set(validated.failures.map((failure) => failure.rule))].join('+');
    logFailure(assetId, `invalid_${rules}`);
    return { source: 'prepared', sentences: preparedSummary(result), reason: `invalid_${rules}` };
  } catch (error) {
    const code = error instanceof ModelError ? error.code : 'unknown';
    logFailure(assetId, code);
    return { source: 'prepared', sentences: preparedSummary(result), reason: code };
  }
}

const inFlight = new Map<string, Promise<SummaryResponse>>();

export async function handleSummary(request: Request, env: SummaryEnv, fetchImpl: FetchLike, cache: SummaryCache): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  let assetId: unknown;
  try {
    assetId = ((await request.json()) as { assetId?: unknown }).assetId;
  } catch {
    return json({ error: 'invalid_body' }, 400);
  }
  // Only the ID is read from the request, so the browser can never supply evidence.
  const asset = assets.find((candidate) => candidate.id === assetId);
  if (!asset) return json({ error: 'unknown_asset' }, 400);

  const alert = alertFor(asset.id);
  if (!alert) return json({ source: 'none' } satisfies SummaryResponse);

  const result = retrieve(asset.id, alert, dataset);
  if (!summaryAllowed(result)) return json({ source: 'none' } satisfies SummaryResponse);

  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    logFailure(asset.id, 'no_key');
    return json({ source: 'prepared', sentences: preparedSummary(result), reason: 'no_key' } satisfies SummaryResponse);
  }

  const key = `${MODEL}/${PROMPT_VERSION}/${asset.id}`;
  const cached = await cache.get(key).catch(() => null);
  if (cached) return json(cached);

  let pending = inFlight.get(key);
  if (!pending) {
    pending = summarize(result, alert, apiKey, fetchImpl).then(async (response) => {
      await cache.put(key, response, response.source === 'gemini' ? GOOD_TTL_MS : FAILED_TTL_MS).catch(() => undefined);
      return response;
    });
    inFlight.set(key, pending);
    void pending.finally(() => inFlight.delete(key));
  }
  return json(await pending);
}

export function memoryCache(now: () => number = Date.now): SummaryCache {
  const entries = new Map<string, { value: SummaryResponse; expires: number }>();
  return {
    async get(key) {
      const entry = entries.get(key);
      if (!entry || entry.expires <= now()) return null;
      return entry.value;
    },
    async put(key, value, ttlMs) {
      entries.set(key, { value, expires: now() + ttlMs });
    },
  };
}
