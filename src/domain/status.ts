import type { Escalation, Finding, MaintenanceRecord } from './types';

/**
 * What a saved finding or escalation means for the machine's status.
 * Neither ever closes an alert: no repair has happened in this prototype.
 */

export const ESCALATION_HEADLINE = 'Escalated through the site process. Waiting on site review.';

export interface InspectionStatus {
  headline: string;
  /** Short lower-case text for "Inspected: ..." on the plant floor. */
  short: string;
  /** What has to happen next, for the action bar. */
  next: string;
}

export function inspectionStatus(outcome: string, records: MaintenanceRecord[]): InspectionStatus {
  if (outcome === 'neither') {
    return { headline: 'Cause still open. Escalate through the site process.', short: 'cause still open', next: 'escalate through the site process' };
  }
  if (outcome === 'inconclusive') {
    return { headline: 'Inconclusive. Reinspect or escalate.', short: 'inconclusive', next: 'reinspect or escalate' };
  }
  if (outcome === 'fault_found') {
    return { headline: 'Fault found. Repair needed.', short: 'fault found', next: 'repair needed' };
  }
  if (outcome === 'no_fault') {
    return { headline: 'No fault found. Cause still open. Reinspect or escalate.', short: 'no fault found', next: 'reinspect or escalate' };
  }
  const label = records.find((record) => record.possibleCause?.key === outcome)?.possibleCause?.label;
  if (label) {
    return { headline: `${label} found. Repair needed.`, short: label.toLowerCase(), next: 'repair needed' };
  }
  return { headline: 'Finding recorded.', short: 'finding recorded', next: 'follow the site process' };
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
