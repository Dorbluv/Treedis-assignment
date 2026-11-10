import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { alertFor, assets, dataset } from '../src/data';
import { retrieve } from '../src/domain/retrieve';
import { preparedSummary } from '../src/domain/summary';
import { TIMEOUT_MS, handleSummary, memoryCache, type SummaryCache } from './summary';

const KEY = 'test-key-not-real';
const env = { GEMINI_API_KEY: KEY };

function modelReply(content: unknown): Response {
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(content) }] } }] }), { status: 200 });
}

const GOOD_M204 = {
  sentences: [
    { text: 'Past records list bearing wear and low lubricant as possible causes.', citations: ['INC-2291', 'INC-1877'] },
    { text: 'These records cannot show which applies to the current fault.', citations: ['INC-2291', 'INC-1877'] },
  ],
};

let cache: SummaryCache;
let model: ReturnType<typeof vi.fn>;

const post = (body: unknown) => new Request('http://x/api/summary', { method: 'POST', body: JSON.stringify(body) });
async function call(assetId: string, useEnv: { GEMINI_API_KEY?: string } = env) {
  const response = await handleSummary(post({ assetId }), useEnv, model as never, cache);
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

const sentModel = () => JSON.parse(model.mock.calls[0][1].body as string) as { contents: { parts: { text: string }[] }[]; systemInstruction: { parts: { text: string }[] } };
const expectedPrepared = (id: string) => preparedSummary(retrieve(id, alertFor(id), dataset));

beforeEach(() => {
  cache = memoryCache();
  model = vi.fn(async () => modelReply(GOOD_M204));
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('request handling', () => {
  it('returns a validated model summary', async () => {
    const { body } = await call('M-204');
    expect(body.source).toBe('gemini');
    expect(body.sentences).toEqual(GOOD_M204.sentences);
  });

  it('rejects other methods, bad JSON and unknown assets', async () => {
    expect((await handleSummary(new Request('http://x/api/summary'), env, model as never, cache)).status).toBe(405);
    expect((await handleSummary(new Request('http://x/api/summary', { method: 'POST', body: 'nope' }), env, model as never, cache)).status).toBe(400);
    expect((await call('X-999')).status).toBe(400);
    expect(model).not.toHaveBeenCalled();
  });

  it.each(['G-204', 'C-204', 'M-310'])('gives no summary on %s and never calls the model', async (id) => {
    expect((await call(id)).body).toEqual({ source: 'none' });
    expect(model).not.toHaveBeenCalled();
  });

  it('ignores evidence supplied by the browser', async () => {
    await handleSummary(post({ assetId: 'M-204', records: [{ id: 'FAKE-1', excerpt: 'browser-supplied text' }] }), env, model as never, cache);
    expect(JSON.stringify(sentModel())).not.toContain('browser-supplied text');
    expect(JSON.stringify(sentModel())).not.toContain('FAKE-1');
  });
});

describe('what reaches the model', () => {
  it('sends only the included records for the asset, with German originals', async () => {
    await call('M-204');
    const prompt = JSON.parse(sentModel().contents[0].parts[0].text) as { records: { id: string; original_excerpt: string }[] };
    const included = retrieve('M-204', alertFor('M-204'), dataset).included.map((item) => item.record);
    expect(prompt.records.map((record) => record.id)).toEqual(included.map((record) => record.id));
    const german = dataset.records.find((record) => record.id === 'INC-1877');
    expect(prompt.records.find((record) => record.id === 'INC-1877')?.original_excerpt).toBe(german?.excerpt);
  });

  it('never sends left-out or uncertain records', async () => {
    await call('M-204');
    const sent = JSON.stringify(sentModel());
    for (const id of ['INC-2310', 'NOTE-5521', 'SOP-014-B', 'INC-1650']) {
      expect(sent).not.toContain(id);
      expect(sent).not.toContain((dataset.records.find((record) => record.id === id) as { excerpt: string }).excerpt);
    }
  });

  it('withholds inspection steps', async () => {
    await call('M-204');
    const sop = dataset.records.find((record) => record.id === 'SOP-014-C') as unknown as { steps: { english: string }[] };
    expect(JSON.stringify(sentModel())).not.toContain(sop.steps[1].english);
  });

  it('sends the key only in the header', async () => {
    await call('M-204');
    const [url, init] = model.mock.calls[0];
    expect(url).not.toContain(KEY);
    expect(init.body).not.toContain(KEY);
    expect(init.headers['x-goog-api-key']).toBe(KEY);
  });
});

describe('fallback', () => {
  it.each([
    ['an invented cause', { sentences: [{ text: 'Past records list misalignment as possible.', citations: ['INC-2291'] }] }, 'invalid_cause'],
    ['a confirmed cause', { sentences: [{ text: 'Bearing wear is confirmed.', citations: ['INC-2291'] }] }, 'invalid_diagnosis+cause_coverage'],
    ['a citation of INC-2310', { sentences: [{ text: 'Vibration was noted on the gearbox.', citations: ['INC-2310'] }] }, 'invalid_citation'],
    ['an added number', { sentences: [{ text: 'Vibration is 11.2 mm/s.', citations: ['SR-M204-01'] }] }, 'invalid_number'],
    ['a restated reading', { sentences: [{ text: 'Vibration is 8.4 mm/s.', citations: ['SR-M204-01'] }] }, 'invalid_restates_reading'],
    ['a record ID in the text', { sentences: [{ text: 'Past records INC-2291 and INC-1877 list bearing wear and low lubricant as possible causes.', citations: ['INC-2291', 'INC-1877'] }] }, 'invalid_record_id'],
    ['an instruction', { sentences: [{ text: 'Check the bearing for play.', citations: ['SOP-014-C'] }] }, 'invalid_instruction'],
    ['the wrong shape', { text: 'hello' }, 'invalid_shape'],
  ])('falls back on %s', async (_name, reply, reason) => {
    model = vi.fn(async () => modelReply(reply));
    const { body } = await call('M-204');
    expect(body.source).toBe('prepared');
    expect(body.reason).toBe(reason);
    expect(body.sentences).toEqual(expectedPrepared('M-204'));
  });

  it.each([
    ['a quota error', async () => new Response('{}', { status: 429 }), 'http_429'],
    ['a server error', async () => new Response('{}', { status: 500 }), 'http_500'],
    ['a network error', async () => { throw new Error('down'); }, 'network'],
    ['no text', async () => new Response('{"candidates":[]}', { status: 200 }), 'empty'],
    ['broken JSON', async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{oops' }] } }] }), { status: 200 }), 'bad_json'],
  ])('falls back on %s', async (_name, reply, reason) => {
    model = vi.fn(reply);
    const { body } = await call('F-118');
    expect(body).toMatchObject({ source: 'prepared', reason });
    expect(body.sentences).toEqual(expectedPrepared('F-118'));
  });

  it('times out at 8 seconds', async () => {
    vi.useFakeTimers();
    let aborted = false;
    model = vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => {
        aborted = true;
        reject(new Error('aborted'));
      });
    }));
    const pending = call('M-204');
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS - 1);
    expect(aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(aborted).toBe(true);
    expect((await pending).body).toMatchObject({ source: 'prepared', reason: 'timeout' });
    expect(TIMEOUT_MS).toBe(8000);
  });

  it('uses the prepared summary with no key, and never calls the model', async () => {
    expect((await call('M-204', {})).body).toMatchObject({ source: 'prepared', reason: 'no_key' });
    expect(model).not.toHaveBeenCalled();
  });
});

describe('cache', () => {
  it('calls the model once per asset', async () => {
    await call('M-204');
    await call('M-204');
    expect(model).toHaveBeenCalledTimes(1);
    await call('F-118');
    expect(model).toHaveBeenCalledTimes(2);
  });

  it('shares one call between requests that arrive together', async () => {
    await Promise.all([call('M-204'), call('M-204'), call('M-204')]);
    expect(model).toHaveBeenCalledTimes(1);
  });

  it('keeps a good result for 30 days and a failure for 5 minutes', async () => {
    let now = 0;
    cache = memoryCache(() => now);
    await call('M-204');
    now = 30 * 24 * 3_600_000 - 1;
    await call('M-204');
    expect(model).toHaveBeenCalledTimes(1);
    now += 1;
    await call('M-204');
    expect(model).toHaveBeenCalledTimes(2);

    now = 0;
    cache = memoryCache(() => now);
    model = vi.fn(async () => new Response('{}', { status: 429 }));
    await call('M-204');
    now = 5 * 60_000 - 1;
    await call('M-204');
    expect(model).toHaveBeenCalledTimes(1);
    now += 1;
    await call('M-204');
    expect(model).toHaveBeenCalledTimes(2);
  });

  it('extends an older 24-hour entry to 30 days once, keeping its wording and calling no model', async () => {
    let now = 0;
    cache = memoryCache(() => now);
    const key = 'gemini-3.5-flash-lite/v5/M-204';
    const old = { source: 'gemini' as const, sentences: [{ text: 'Reviewed wording.', citations: ['INC-2291'] }] };
    await cache.put(key, old, 24 * 3_600_000);
    const put = vi.spyOn(cache, 'put');

    expect((await call('M-204')).body).toEqual(old);
    await call('M-204');
    expect(put).toHaveBeenCalledTimes(1);

    now = 29 * 24 * 3_600_000;
    expect((await call('M-204')).body).toEqual(old);
    expect(model).not.toHaveBeenCalled();
  });

  it('still answers when the cache throws', async () => {
    cache = { get: async () => { throw new Error('x'); }, put: async () => { throw new Error('x'); } };
    expect((await call('M-204')).body.source).toBe('gemini');
  });
});

describe('secrets and retrieval', () => {
  it('never puts the key in a response or a log', async () => {
    const log = vi.spyOn(console, 'log');
    const warn = vi.spyOn(console, 'warn');
    model = vi.fn(async () => new Response(`bad key ${KEY}`, { status: 403 }));
    const { body } = await call('M-204');
    expect(JSON.stringify(body)).not.toContain(KEY);
    expect(JSON.stringify([...log.mock.calls, ...warn.mock.calls])).not.toContain(KEY);
  });

  it('leaves retrieval identical with AI on, off, or failing', async () => {
    const snapshot = () => assets.map((asset) => retrieve(asset.id, alertFor(asset.id), dataset));
    const before = JSON.stringify(snapshot());
    await call('M-204');
    await call('M-310', {});
    model = vi.fn(async () => modelReply({ sentences: [{ text: 'Bearing wear is confirmed.', citations: ['INC-2310'] }] }));
    await call('F-118');
    expect(JSON.stringify(snapshot())).toBe(before);
  });
});
