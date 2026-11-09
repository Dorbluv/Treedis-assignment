import type { RetrievalResult } from '../domain/types';

export function time(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function outcomeOptions(result: RetrievalResult): { key: string; label: string }[] {
  return [
    ...result.possibleCauses.map((cause) => ({ key: cause.key, label: cause.label })),
    { key: 'neither', label: 'Neither' },
    { key: 'inconclusive', label: 'Inconclusive' },
  ];
}
