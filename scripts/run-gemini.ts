/**
 * Runs the real model and records every raw result. Run with:
 *   npx vite-node scripts/run-gemini.ts -- <label> [runs]
 * The key comes from .dev.vars and is never printed or written.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { alertFor, dataset, records } from '../src/data';
import { retrieve } from '../src/domain/retrieve';
import { validateSummary } from '../src/domain/summary';
import type { Alert } from '../src/domain/types';
import { readDevVars } from '../worker/devVars';
import { MODEL, ModelError, PROMPT_VERSION, askModel, SYSTEM_PROMPT } from '../worker/summary';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const label = args[0] ?? 'run';
const runs = Number(args[1] ?? 3);
const apiKey = readDevVars().GEMINI_API_KEY;
if (!apiKey) {
  console.error('No GEMINI_API_KEY in .dev.vars');
  process.exit(1);
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const output: unknown[] = [];

for (const assetId of ['M-204', 'M-310', 'F-118']) {
  const alert = alertFor(assetId) as Alert;
  const result = retrieve(assetId, alert, dataset);
  for (let run = 1; run <= runs; run += 1) {
    const started = Date.now();
    const entry: Record<string, unknown> = { assetId, run, at: new Date().toISOString() };
    try {
      const raw = await askModel(result, alert, apiKey, (input, init) => fetch(input, init));
      entry.raw = raw;
      const validated = validateSummary(raw, result);
      entry.valid = validated.ok;
      if (!validated.ok) entry.failures = validated.failures;
    } catch (error) {
      entry.valid = false;
      entry.error = error instanceof ModelError ? error.code : 'unknown';
    }
    entry.latencyMs = Date.now() - started;
    output.push(entry);
    console.log(`${assetId} run ${run}: ${entry.valid ? 'valid' : `FAILED ${entry.error ?? JSON.stringify(entry.failures)}`} (${entry.latencyMs} ms)`);
    await wait(7000);
  }
}

mkdirSync('evidence/gate-3', { recursive: true });
const excerpts = Object.fromEntries(records.map((record) => [record.id, record.excerpt]));
writeFileSync(
  `evidence/gate-3/model-runs-${label}.json`,
  JSON.stringify({ model: MODEL, promptVersion: PROMPT_VERSION, systemPrompt: SYSTEM_PROMPT, excerpts, runs: output }, null, 2) + '\n',
);
