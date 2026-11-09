import { handleSummary, memoryCache, type SummaryCache, type SummaryEnv } from './summary';
import type { SummaryResponse } from '../src/domain/summary';

interface Env extends SummaryEnv {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

const memory = memoryCache();
const cacheUrl = (key: string) => `https://summary-cache.invalid/${key}`;

/** The isolate's memory first, then the data center's Cache API. Needs no account setup. */
const cache: SummaryCache = {
  async get(key) {
    const local = await memory.get(key);
    if (local) return local;
    const store = (caches as unknown as { default: Cache }).default;
    const hit = await store.match(cacheUrl(key));
    return hit ? ((await hit.json()) as SummaryResponse) : null;
  },
  async put(key, value, ttlMs) {
    await memory.put(key, value, ttlMs);
    const store = (caches as unknown as { default: Cache }).default;
    await store.put(
      cacheUrl(key),
      new Response(JSON.stringify(value), {
        headers: { 'content-type': 'application/json', 'cache-control': `public, max-age=${Math.floor(ttlMs / 1000)}` },
      }),
    );
  },
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/summary') return handleSummary(request, env, (input, init) => fetch(input, init), cache);
    if (pathname.startsWith('/api/')) return new Response('Not found', { status: 404 });
    return env.ASSETS.fetch(request);
  },
};
