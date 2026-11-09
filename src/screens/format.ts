import type { RetrievalResult } from '../domain/types';

export function time(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function longDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-GB', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function outcomeOptions(result: RetrievalResult): { key: string; label: string }[] {
  return [
    ...result.possibleCauses.map((cause) => ({ key: cause.key, label: cause.label })),
    { key: 'neither', label: 'Neither' },
    { key: 'inconclusive', label: 'Inconclusive' },
  ];
}
