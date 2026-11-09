import type { Escalation, Finding, MaintenanceRecord } from './types';

/**
 * What a saved finding or escalation means for the machine's status.
 * Neither ever closes an alert: no repair has happened in this prototype.
 */

export const INSPECTION_STAGES = ['Alert raised', 'Inspected', 'Repair', 'Closed'];
export const ESCALATION_STAGES = ['Alert raised', 'Escalated', 'Site review', 'Closed'];

export const ESCALATION_HEADLINE = 'Escalated through the site process. Waiting on site review.';

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
  if (outcome === 'fault_found') {
    return { headline: 'Fault found. Repair needed.', short: 'fault found' };
  }
  if (outcome === 'no_fault') {
    return { headline: 'No fault found. Cause still open. Reinspect or escalate.', short: 'no fault found' };
  }
  const label = records.find((record) => record.possibleCause?.key === outcome)?.possibleCause?.label;
  if (label) {
    return { headline: `${label} found. Repair needed.`, short: label.toLowerCase() };
  }
  return { headline: 'Finding recorded.', short: 'finding recorded' };
}

export interface FollowUp {
  kind: 'inspected' | 'escalated';
  text: string;
}

/** What has happened since the alert was raised, if anything. */
export function followUp(
  finding: Finding | undefined,
  escalation: Escalation | undefined,
  records: MaintenanceRecord[],
): FollowUp | null {
  if (escalation) return { kind: 'escalated', text: 'Escalated' };
  if (finding) return { kind: 'inspected', text: `Inspected: ${inspectionStatus(finding.outcome, records).short}` };
  return null;
}
