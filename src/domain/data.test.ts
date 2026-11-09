import { describe, expect, it } from 'vitest';
import { alerts, assets, records } from '../data';
import type { SopRecord } from './types';

const assetIds = new Set(assets.map((asset) => asset.id));
const recordIds = new Set(records.map((record) => record.id));

describe('dataset integrity', () => {
  it('has unique record ids', () => {
    expect(recordIds.size).toBe(records.length);
  });

  it('resolves every asset reference', () => {
    for (const asset of assets) {
      if (asset.parentId !== null) expect(assetIds).toContain(asset.parentId);
    }
    for (const record of records) {
      if (record.assetId !== null) expect(assetIds).toContain(record.assetId);
      for (const linked of record.linkedAssetIds) expect(assetIds).toContain(linked);
    }
  });

  it('resolves each alert to an asset and a sensor record', () => {
    for (const alert of alerts) {
      expect(assetIds).toContain(alert.assetId);
      expect(recordIds).toContain(alert.sensorRecordId);
    }
  });

  it('stores an English explanation on every German record', () => {
    const german = records.filter((record) => record.language === 'de');
    expect(german.length).toBeGreaterThan(0);
    for (const record of german) expect(record.englishExplanation.trim()).not.toBe('');
  });

  it('requires candidates on every unknown-applicability record', () => {
    for (const record of records) {
      if (record.assetId === null) {
        expect(record.candidateLine).toBeTruthy();
        expect(record.candidateType).toBeTruthy();
      }
    }
  });

  it('gives every incident a real date', () => {
    const incidents = records.filter((record) => record.kind === 'incident');
    expect(incidents.length).toBeGreaterThan(0);
    for (const record of incidents) expect(record.occurredOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('starts SOP-014 rev C with site-approved isolation and lockout', () => {
    const sop = records.find((record) => record.id === 'SOP-014-C') as SopRecord;
    expect(sop.steps[0].english).toMatch(/isolate and lock out/i);
    expect(sop.steps[0].english).toMatch(/site-approved/i);
    expect(sop.steps[0].english).toMatch(/before the inspection/i);
  });
});
