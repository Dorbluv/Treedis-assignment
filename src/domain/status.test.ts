import { describe, expect, it } from 'vitest';
import { records } from '../data';
import { ESCALATION_HEADLINE, followUp, inspectionStatus } from './status';

describe('inspection status', () => {
  it.each([
    ['bearing_wear', 'Bearing wear found. Repair needed.', 'bearing wear', 'repair needed'],
    ['lubrication', 'Lubrication problem found. Repair needed.', 'lubrication problem', 'repair needed'],
    ['neither', 'Cause still open. Escalate through the site process.', 'cause still open', 'escalate through the site process'],
    ['inconclusive', 'Inconclusive. Reinspect or escalate.', 'inconclusive', 'reinspect or escalate'],
    ['fault_found', 'Fault found. Repair needed.', 'fault found', 'repair needed'],
    ['no_fault', 'No fault found. Cause still open. Reinspect or escalate.', 'no fault found', 'reinspect or escalate'],
  ])('maps %s to the right status', (outcome, headline, short, next) => {
    expect(inspectionStatus(outcome, records)).toEqual({ headline, short, next });
  });

  it('never says an outcome is fixed, solved or closed', () => {
    const headlines = ['bearing_wear', 'lubrication', 'neither', 'inconclusive', 'fault_found', 'no_fault', 'x'].map(
      (outcome) => inspectionStatus(outcome, records).headline,
    );
    for (const headline of [...headlines, ESCALATION_HEADLINE]) {
      expect(headline).not.toMatch(/fixed|solved|closed|resolved/i);
    }
  });
});

describe('follow-up', () => {
  const finding = { outcome: 'fault_found', savedAt: '2026-11-09T10:00:00.000Z' };
  const escalation = { assetId: 'F-118', escalatedAt: '2026-11-09T10:00:00.000Z' };

  it('is nothing until something has happened', () => {
    expect(followUp(undefined, undefined, records)).toBeNull();
  });

  it('describes a finding and an escalation', () => {
    expect(followUp(finding, undefined, records)).toEqual({ kind: 'inspected', text: 'Inspected: fault found' });
    expect(followUp(undefined, escalation, records)).toEqual({ kind: 'escalated', text: 'Escalated' });
  });
});
