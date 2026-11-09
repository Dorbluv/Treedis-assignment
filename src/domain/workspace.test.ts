import { describe, expect, it } from 'vitest';
import { alerts, dataset, records } from '../data';
import type { SopRecord } from './types';
import {
  activityEvents,
  alertStartedAt,
  causeHeading,
  primaryActionKind,
  recordsChecked,
  relativeAge,
  resolveTab,
  safetyMessage,
  statusPills,
  tabAvailability,
} from './workspace';

const sop = (id: string) => records.find((record) => record.id === id) as SopRecord;
const base = { hasAlert: true, hasSop: true, planSaved: false, findingSaved: false, escalated: false };

describe('status pills', () => {
  it('starts at Investigating', () => {
    expect(statusPills(true, false, false).map((pill) => [pill.label, pill.state])).toEqual([
      ['Alert raised', 'done'],
      ['Investigating', 'current'],
      ['Inspected', 'future'],
      ['Repair', 'future'],
      ['Closed', 'future'],
    ]);
  });

  it('advances to Inspected after a finding and never to Repair or Closed', () => {
    const pills = statusPills(true, true, false);
    expect(pills.map((pill) => pill.state)).toEqual(['done', 'done', 'current', 'future', 'future']);
  });

  it('uses the escalation track without a procedure', () => {
    const pills = statusPills(false, false, true);
    expect(pills.map((pill) => pill.label)).toEqual(['Alert raised', 'Investigating', 'Escalated', 'Site review', 'Closed']);
    expect(pills[2].state).toBe('current');
  });
});

describe('tab rules', () => {
  it('keeps Finding inactive until the plan is saved', () => {
    expect(tabAvailability(true, false)).toEqual({ investigate: true, plan: true, finding: false });
    expect(tabAvailability(true, true).finding).toBe(true);
  });

  it('blocks Plan and Finding with no procedure', () => {
    expect(tabAvailability(false, true)).toEqual({ investigate: true, plan: false, finding: false });
  });

  it('redirects a blocked tab', () => {
    expect(resolveTab('finding', tabAvailability(true, false))).toBe('plan');
    expect(resolveTab('plan', tabAvailability(false, false))).toBe('investigate');
    expect(resolveTab('finding', tabAvailability(false, false))).toBe('investigate');
  });
});

describe('primary action', () => {
  it('follows the inspection state', () => {
    expect(primaryActionKind({ ...base, tab: 'investigate' })).toBe('start-plan');
    expect(primaryActionKind({ ...base, tab: 'plan' })).toBe('save-plan');
    expect(primaryActionKind({ ...base, planSaved: true, tab: 'finding' })).toBe('save-finding');
    expect(primaryActionKind({ ...base, planSaved: true, findingSaved: true, tab: 'investigate' })).toBe('back');
  });

  it('escalates with no procedure, and has only Back with no alert', () => {
    expect(primaryActionKind({ ...base, hasSop: false, tab: 'investigate' })).toBe('escalate');
    expect(primaryActionKind({ ...base, hasSop: false, escalated: true, tab: 'investigate' })).toBe('back');
    expect(primaryActionKind({ ...base, hasAlert: false, hasSop: false, tab: 'investigate' })).toBe('back');
  });
});

describe('computed text', () => {
  it('counts records from the data', () => {
    expect(recordsChecked(dataset)).toBe(dataset.records.length);
    expect(recordsChecked({ assets: dataset.assets, records: dataset.records.slice(0, 3) })).toBe(3);
  });

  it('writes the cause heading from the count', () => {
    expect(causeHeading(2)).toBe('Two possible causes');
    expect(causeHeading(1)).toBe('One possible cause');
  });
});

describe('safety message', () => {
  it('comes from the first SOP step when it is lockout', () => {
    expect(safetyMessage(sop('SOP-014-C'))).toBe('Lock out the motor before you inspect it.');
    expect(safetyMessage(sop('SOP-022'))).toBe('Lock out the motor before you inspect it.');
    expect(safetyMessage(sop('SOP-014-C'), 'de')).toBe('Motor freischalten und sichern, bevor Sie ihn prüfen.');
  });

  it('is absent with no procedure, or when the first step is something else', () => {
    expect(safetyMessage(null)).toBeNull();
    const other = { ...sop('SOP-014-C'), steps: [{ id: 'x', title: 'Check the bearing', english: 'e', original: 'o' }] };
    expect(safetyMessage(other)).toBeNull();
  });
});

describe('alert time', () => {
  const HOUR = 3_600_000;

  it('stores an age, never a fixed date', () => {
    expect(alerts.map((alert) => alert.ageHours)).toEqual([2, 5, 20]);
    expect(JSON.stringify(alerts)).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it('computes the start from the load time, so it always looks current', () => {
    for (const loadedAt of [Date.UTC(2026, 0, 1), Date.UTC(2031, 5, 15)]) {
      expect(alertStartedAt(alerts[0], loadedAt)).toBe(loadedAt - 2 * HOUR);
      expect(relativeAge(alertStartedAt(alerts[2], loadedAt), loadedAt)).toBe('20 h');
    }
  });

  it('writes relative time in minutes, hours or days', () => {
    expect(relativeAge(0, 20_000)).toBe('1 min');
    expect(relativeAge(0, 45 * 60_000)).toBe('45 min');
    expect(relativeAge(0, 5 * HOUR + 59 * 60_000)).toBe('5 h');
    expect(relativeAge(0, 72 * HOUR)).toBe('3 d');
  });
});

describe('activity', () => {
  it('lists only alerts when nothing has been saved', () => {
    const events = activityEvents(alerts, {}, {}, records);
    expect(events).toHaveLength(alerts.length);
    expect(events[0].text).toBe('M-204 abnormal vibration');
    expect(events.every((event) => event.kind === 'alert')).toBe(true);
  });

  it('puts saved events first, using their timestamps', () => {
    const plan = {
      assetId: 'M-204',
      sopRecordId: 'SOP-014-C',
      stepIds: [],
      evidenceIds: [],
      savedAt: '2026-11-10T10:00:00.000Z',
      finding: { outcome: 'bearing_wear', savedAt: '2026-11-10T11:00:00.000Z' },
    };
    const escalation = { assetId: 'F-118', escalatedAt: '2026-11-10T12:00:00.000Z' };
    const events = activityEvents(alerts, { 'M-204': plan }, { 'F-118': escalation }, records);
    expect(events.slice(0, 3).map((event) => event.text)).toEqual([
      'F-118 escalated',
      'M-204 inspected: bearing wear',
      'M-204 plan saved',
    ]);
    expect(events[0].at).toBe(Date.parse(escalation.escalatedAt));
  });

  it('lists old saved actions before alerts whose start moved with this load', () => {
    const plan = { assetId: 'M-204', sopRecordId: 'SOP-014-C', stepIds: [], evidenceIds: [], savedAt: '2020-01-01T10:00:00.000Z' };
    const events = activityEvents(alerts, { 'M-204': plan }, {}, records);
    expect(events[0].text).toBe('M-204 plan saved');
  });
});
