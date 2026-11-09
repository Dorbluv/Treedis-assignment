import type { MaintenanceRecord } from './types';

/**
 * What a saved finding means for the machine's status.
 * A finding never closes an alert: no repair has happened in this prototype.
 */

export const INSPECTION_STAGES = ['Alert raised', 'Inspected', 'Repair', 'Closed'] as const;

export interface InspectionStatus {
  headline: string;
  /** Short lower-case text for "Inspected: ..." on the plant floor. */
  short: string;
}

export function inspectionStatus(outcome: string, records: MaintenanceRecord[]): InspectionStatus {
  if (outcome === 'neither') {
    return { headline: 'Cause still open. Escalate through the site process.', short: 'cause still open' };
  }
  if (outcome === 'inconclusive') {
    return { headline: 'Inconclusive. Reinspect or escalate.', short: 'inconclusive' };
  }
  if (outcome === 'issue_found') {
    return { headline: 'Issue found. Repair needed.', short: 'issue found' };
  }
  if (outcome === 'no_issue') {
    return { headline: 'No issue found.', short: 'no issue found' };
  }
  const label = records.find((record) => record.possibleCause?.key === outcome)?.possibleCause?.label;
  if (label) {
    return { headline: `${label} found. Repair needed.`, short: label.toLowerCase() };
  }
  return { headline: 'Finding recorded.', short: 'finding recorded' };
}
