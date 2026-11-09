import type { MaintenanceRecord, RetrievalResult } from '../domain/types';

/** One date format everywhere: "9 Nov 2026", or "9 Nov 2026, 14:22" when time matters. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** For a calendar date stored as YYYY-MM-DD, which has no time zone. */
export function formatDay(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/** For a moment in time, shown in local time. */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return `${formatDate(iso)}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** The one-line summary of a record, with its date where it has one. */
export function recordLine(record: MaintenanceRecord): string {
  return record.occurredOn ? `${record.takeaway}, ${formatDay(record.occurredOn)}` : record.takeaway;
}

const VIEW_NAMES: Record<string, string> = {
  selected: 'Machine',
  evidence: 'Evidence',
  source: 'Source',
  plan: 'Plan',
  finding: 'Finding',
  done: 'Summary',
};

export function pageTitle(view: string, assetId: string | null): string {
  const app = 'Maintenance Copilot';
  return assetId ? `${VIEW_NAMES[view] ?? 'Machine'}, ${assetId}, ${app}` : `Plant floor, ${app}`;
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
      { key: 'fault_found', label: 'Fault found', suggestions: ['Play at the bearing', 'Loose mounting bolts'] },
      { key: 'no_fault', label: 'No fault found', suggestions: ['Bearing and bolts normal'] },
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
