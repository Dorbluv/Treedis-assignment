import { existsSync, readFileSync } from 'node:fs';

/** Reads .dev.vars for local runs. The values stay in server code and are never printed. */
export function readDevVars(path = '.dev.vars'): Record<string, string> {
  if (!existsSync(path)) return {};
  const vars: Record<string, string> = {};
  for (const line of readFileSync(path, 'utf8').replace(/^﻿/, '').split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (match) vars[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
  return vars;
}
