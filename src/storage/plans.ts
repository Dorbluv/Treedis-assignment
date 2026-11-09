import type { Escalation, Finding, SavedPlan } from '../domain/types';

export const STORAGE_KEY = 'maintenance-copilot:v1:plans';
export const ESCALATIONS_KEY = 'maintenance-copilot:v1:escalations';

export type EscalationMap = Record<string, Escalation>;

export type PlanMap = Record<string, SavedPlan>;
type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function readAll(storage: StorageLike): PlanMap {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    return parsed as PlanMap;
  } catch {
    return {};
  }
}

export function loadPlan(assetId: string, storage: StorageLike = localStorage): SavedPlan | null {
  return readAll(storage)[assetId] ?? null;
}

export function savePlan(plan: SavedPlan, storage: StorageLike = localStorage): void {
  const all = readAll(storage);
  all[plan.assetId] = plan;
  storage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function loadAllPlans(storage: StorageLike = localStorage): PlanMap {
  return readAll(storage);
}

export function loadEscalations(storage: StorageLike = localStorage): EscalationMap {
  try {
    const raw = storage.getItem(ESCALATIONS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    return parsed as EscalationMap;
  } catch {
    return {};
  }
}

export function saveEscalation(escalation: Escalation, storage: StorageLike = localStorage): void {
  const all = loadEscalations(storage);
  all[escalation.assetId] = escalation;
  storage.setItem(ESCALATIONS_KEY, JSON.stringify(all));
}

export function hasSavedPlans(storage: StorageLike = localStorage): boolean {
  return Object.keys(readAll(storage)).length + Object.keys(loadEscalations(storage)).length > 0;
}

/** Reset demo: every plan, finding and escalation. */
export function clearPlans(storage: StorageLike = localStorage): void {
  storage.removeItem(STORAGE_KEY);
  storage.removeItem(ESCALATIONS_KEY);
}

export function saveFinding(
  assetId: string,
  finding: Finding,
  storage: StorageLike = localStorage,
): SavedPlan | null {
  const plan = loadPlan(assetId, storage);
  if (!plan) return null;
  const updated: SavedPlan = { ...plan, finding };
  savePlan(updated, storage);
  return updated;
}
