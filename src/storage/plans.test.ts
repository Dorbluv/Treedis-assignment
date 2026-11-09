import { describe, expect, it } from 'vitest';
import type { SavedPlan } from '../domain/types';
import {
  STORAGE_KEY,
  clearPlans,
  hasSavedPlans,
  loadEscalations,
  loadPlan,
  saveEscalation,
  saveFinding,
  savePlan,
} from './plans';

function fakeStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  };
}

const plan: SavedPlan = {
  assetId: 'M-204',
  sopRecordId: 'SOP-014-C',
  stepIds: ['SOP-014-C-1'],
  evidenceIds: ['INC-2291'],
  savedAt: '2026-11-09T10:00:00.000Z',
};

describe('plan storage', () => {
  it('round-trips a plan and its finding', () => {
    const storage = fakeStorage();
    savePlan(plan, storage);
    saveFinding(
      'M-204',
      { outcome: 'bearing_wear', note: 'Rough running', savedAt: '2026-11-09T11:00:00.000Z' },
      storage,
    );
    const loaded = loadPlan('M-204', storage);
    expect(loaded?.evidenceIds).toEqual(['INC-2291']);
    expect(loaded?.finding?.outcome).toBe('bearing_wear');
    expect(loaded?.finding?.note).toBe('Rough running');
  });

  it('does not save a finding without a plan', () => {
    const storage = fakeStorage();
    expect(saveFinding('M-204', { outcome: 'neither', savedAt: 'x' }, storage)).toBeNull();
  });

  it('clears saved data for a demo reset', () => {
    const storage = fakeStorage();
    savePlan(plan, storage);
    clearPlans(storage);
    expect(loadPlan('M-204', storage)).toBeNull();
  });

  it('clears escalations for a demo reset too', () => {
    const storage = fakeStorage();
    saveEscalation({ assetId: 'F-118', escalatedAt: '2026-11-09T10:00:00.000Z' }, storage);
    expect(loadEscalations(storage)['F-118']).toBeDefined();
    expect(hasSavedPlans(storage)).toBe(true);
    clearPlans(storage);
    expect(loadEscalations(storage)).toEqual({});
    expect(hasSavedPlans(storage)).toBe(false);
  });

  it('reads corrupt storage as empty', () => {
    expect(loadPlan('M-204', fakeStorage({ [STORAGE_KEY]: '{not json' }))).toBeNull();
  });
});
