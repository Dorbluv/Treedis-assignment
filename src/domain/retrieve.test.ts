import { describe, expect, it } from 'vitest';
import { alertFor, dataset } from '../data';
import { retrieve } from './retrieve';
import type { Alert, Dataset, EvidenceItem, MaintenanceRecord } from './types';

const alert = alertFor('M-204') as Alert;
const ids = (items: EvidenceItem[]) => items.map((item) => item.record.id);
const find = (items: EvidenceItem[], id: string) => items.find((item) => item.record.id === id);

function withRecords(...extra: MaintenanceRecord[]): Dataset {
  return { assets: dataset.assets, records: [...dataset.records, ...extra] };
}

function incident(overrides: Partial<MaintenanceRecord> & { id: string; assetId: string }): MaintenanceRecord {
  return {
    kind: 'incident',
    title: 'Fixture incident',
    linkedAssetIds: [],
    conditions: ['vibration'],
    language: 'en',
    excerpt: 'Fixture excerpt.',
    englishExplanation: 'Fixture explanation.',
    limitation: 'Fixture limitation.',
    ...overrides,
  } as MaintenanceRecord;
}

describe('M-204 with the real dataset', () => {
  const result = retrieve('M-204', alert, dataset);

  it('labels exact-asset records by kind', () => {
    expect(find(result.included, 'SR-M204-01')?.label).toBe('Current reading');
    expect(find(result.included, 'INC-2291')?.label).toBe('Direct asset history');
    expect(find(result.included, 'INC-1877')?.label).toBe('Direct asset history');
    expect(find(result.included, 'SOP-014-C')?.label).toBe('Applicable procedure');
  });

  it('creates exactly the two possible causes from direct incidents', () => {
    expect(result.possibleCauses).toEqual([
      { key: 'bearing_wear', label: 'Bearing wear', recordId: 'INC-2291' },
      { key: 'lubrication', label: 'Lubrication problem', recordId: 'INC-1877' },
    ]);
  });

  it('includes the parent record as assembly-level context', () => {
    expect(find(result.included, 'ASM-0412')?.label).toBe('Assembly-level context');
  });

  it('flags NOTE-5521 as uncertain and never as evidence', () => {
    expect(ids(result.uncertain)).toEqual(['NOTE-5521']);
    expect(ids(result.included)).not.toContain('NOTE-5521');
  });

  it('excludes INC-2310 and reports the keyword match', () => {
    const item = find(result.excluded, 'INC-2310');
    expect(item).toBeDefined();
    expect(item?.keywordMatch).toBe('vibration');
    expect(ids(result.included)).not.toContain('INC-2310');
    expect(result.possibleCauses.map((cause) => cause.recordId)).not.toContain('INC-2310');
  });

  it('excludes superseded SOP rev B and uses rev C as the applicable SOP', () => {
    expect(find(result.excluded, 'SOP-014-B')?.label).toBe('Superseded by rev C');
    expect(ids(result.included)).not.toContain('SOP-014-B');
    expect(result.applicableSop?.id).toBe('SOP-014-C');
  });

  it('keeps another motor SOP as comparison and never applicable', () => {
    expect(result.applicableSop?.id).not.toBe('SOP-022');
    expect(ids(result.included)).not.toContain('SOP-022');
    expect(ids(result.comparison)).toEqual(['SOP-022', 'SR-M310-01']);
  });
});

describe('scoping', () => {
  it.each(['C-204', 'G-204', 'M-310', 'F-118'])('drops superseded SOP rev B for %s', (assetId) => {
    const result = retrieve(assetId, null, dataset);
    const all = [...result.included, ...result.excluded, ...result.uncertain, ...result.comparison];
    expect(ids(all)).not.toContain('SOP-014-B');
  });

  it('shows NOTE-5521 as uncertain for the other line 2 motor', () => {
    expect(ids(retrieve('M-310', null, dataset).uncertain)).toEqual(['NOTE-5521']);
  });

  it.each(['C-204', 'G-204', 'F-118'])('does not show NOTE-5521 for non-matching %s', (assetId) => {
    expect(ids(retrieve(assetId, null, dataset).uncertain)).toEqual([]);
  });

  it('drops an unknown-applicability record on another line', () => {
    const data = withRecords(
      incident({ id: 'FX-LINE3', kind: 'note', assetId: null as unknown as string, candidateLine: '3', candidateType: 'motor' } as never),
    );
    const result = retrieve('M-204', alert, data);
    expect(ids(result.uncertain)).toEqual(['NOTE-5521']);
  });
});

describe('Gate 2 assets', () => {
  const m310 = retrieve('M-310', alertFor('M-310'), dataset);
  const f118 = retrieve('F-118', alertFor('F-118'), dataset);

  it('excludes INC-2310 on M-204 and treats it as direct history on G-204', () => {
    expect(ids(retrieve('M-204', alert, dataset).excluded)).toContain('INC-2310');
    const g204 = retrieve('G-204', alertFor('G-204'), dataset);
    expect(find(g204.included, 'INC-2310')?.label).toBe('Direct asset history');
    expect(ids(g204.excluded)).not.toContain('INC-2310');
    expect(g204.applicableSop).toBeNull();
  });

  it('gives M-310 no causes, and keeps M-204 incidents out of its history', () => {
    expect(m310.possibleCauses).toEqual([]);
    expect(ids(m310.included)).toEqual(['SOP-022', 'SR-M310-01']);
    expect(ids(m310.included)).not.toContain('INC-2291');
    expect(ids(m310.included)).not.toContain('INC-1877');
    expect(m310.applicableSop?.id).toBe('SOP-022');
  });

  it('gives F-118 its own cause and never an applicable SOP', () => {
    expect(f118.possibleCauses).toEqual([{ key: 'nozzle_blockage', label: 'Nozzle blockage', recordId: 'INC-1650' }]);
    expect(f118.applicableSop).toBeNull();
    expect(f118.included.some((item) => item.record.kind === 'sop')).toBe(false);
  });

  it('never makes a superseded SOP applicable on any asset', () => {
    for (const { id } of dataset.assets) {
      const result = retrieve(id, alertFor(id), dataset);
      expect(result.applicableSop?.status ?? 'current').toBe('current');
      expect(ids(result.included)).not.toContain('SOP-014-B');
    }
  });
});

describe('fixtures for rules the dataset does not exercise', () => {
  it('keeps an exact-asset incident with no alert overlap as history, but not as a cause', () => {
    const data = withRecords(
      incident({
        id: 'FX-NOOVERLAP',
        assetId: 'M-204',
        conditions: ['overheating'],
        possibleCause: { key: 'fan', label: 'Fan failure' },
      }),
    );
    const result = retrieve('M-204', alert, data);
    expect(find(result.included, 'FX-NOOVERLAP')?.label).toBe('Direct asset history');
    expect(result.possibleCauses.map((cause) => cause.key)).not.toContain('fan');
  });

  it('gives an explicitly linked sibling its label and never a cause', () => {
    const data = withRecords(
      incident({
        id: 'FX-LINKED',
        assetId: 'G-204',
        linkedAssetIds: ['M-204'],
        possibleCause: { key: 'coupling', label: 'Coupling damage' },
      }),
    );
    const result = retrieve('M-204', alert, data);
    expect(find(result.included, 'FX-LINKED')?.label).toBe('Linked component record');
    expect(ids(result.excluded)).not.toContain('FX-LINKED');
    expect(result.possibleCauses.map((cause) => cause.key)).not.toContain('coupling');
  });

  it('does not create a cause from a parent incident', () => {
    const data = withRecords(
      incident({
        id: 'FX-PARENT',
        assetId: 'C-204',
        possibleCause: { key: 'belt', label: 'Belt tension' },
      }),
    );
    const result = retrieve('M-204', alert, data);
    expect(find(result.included, 'FX-PARENT')?.label).toBe('Assembly-level context');
    expect(result.possibleCauses.map((cause) => cause.key)).not.toContain('belt');
  });

  it('drops a parent record that does not overlap the alert', () => {
    const data = withRecords(incident({ id: 'FX-PARENT-OTHER', assetId: 'C-204', conditions: ['belt-tear'] }));
    const result = retrieve('M-204', alert, data);
    expect(ids(result.included)).not.toContain('FX-PARENT-OTHER');
    expect(ids(result.excluded)).not.toContain('FX-PARENT-OTHER');
  });

  it('treats same-type records elsewhere as comparison only', () => {
    const data = withRecords(
      incident({
        id: 'FX-ELSEWHERE',
        assetId: 'M-310',
        possibleCause: { key: 'mount', label: 'Loose mount' },
      }),
    );
    const result = retrieve('M-204', alert, data);
    expect(find(result.comparison, 'FX-ELSEWHERE')?.label).toBe('Comparison only');
    expect(ids(result.included)).not.toContain('FX-ELSEWHERE');
    expect(result.possibleCauses.map((cause) => cause.key)).not.toContain('mount');
  });

  it('does not let a keyword match change eligibility', () => {
    const data = withRecords(
      incident({ id: 'FX-KEYWORD', assetId: 'F-118', excerpt: 'vibration vibration vibration' }),
    );
    const result = retrieve('M-204', alert, data);
    const all = [...result.included, ...result.excluded, ...result.uncertain, ...result.comparison];
    expect(ids(all)).not.toContain('FX-KEYWORD');
  });
});
