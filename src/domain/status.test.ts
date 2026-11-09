import { describe, expect, it } from 'vitest';
import { records } from '../data';
import { inspectionStatus } from './status';

describe('inspection status', () => {
  it.each([
    ['bearing_wear', 'Bearing wear found. Repair needed.', 'bearing wear'],
    ['lubrication', 'Lubrication problem found. Repair needed.', 'lubrication problem'],
    ['neither', 'Cause still open. Escalate through the site process.', 'cause still open'],
    ['inconclusive', 'Inconclusive. Reinspect or escalate.', 'inconclusive'],
  ])('maps %s to the right status', (outcome, headline, short) => {
    expect(inspectionStatus(outcome, records)).toEqual({ headline, short });
  });

  it('never says an outcome is fixed, solved or closed', () => {
    for (const outcome of ['bearing_wear', 'lubrication', 'neither', 'inconclusive', 'issue_found', 'no_issue', 'x']) {
      expect(inspectionStatus(outcome, records).headline).not.toMatch(/fixed|solved|closed|resolved/i);
    }
  });
});
