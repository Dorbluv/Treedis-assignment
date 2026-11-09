import type { RetrievalResult } from '../domain/types';

export function time(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function shortDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-GB', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export interface OutcomeOption {
  key: string;
  label: string;
  suggestions: string[];
}

export function outcomeOptions(result: RetrievalResult): OutcomeOption[] {
  // With no possible causes, "Neither" would have nothing to refer to.
  if (result.possibleCauses.length === 0) {
    return [
      { key: 'issue_found', label: 'Issue found', suggestions: ['Play at the bearing', 'Loose mounting bolts'] },
      { key: 'no_issue', label: 'No issue found', suggestions: ['Bearing and bolts normal'] },
      { key: 'inconclusive', label: 'Inconclusive', suggestions: ['Could not reach the bearing', 'Needs a second inspection'] },
    ];
  }
  return [
    ...result.possibleCauses.map((cause) => ({
      key: cause.key,
      label: cause.label,
      suggestions: result.included.find((item) => item.record.id === cause.recordId)?.record.noteSuggestions ?? [],
    })),
    { key: 'neither', label: 'Neither', suggestions: ['Bearing and lubricant normal', 'Alignment off at coupling'] },
    { key: 'inconclusive', label: 'Inconclusive', suggestions: ['Could not reach the bearing', 'Needs a second inspection'] },
  ];
}
