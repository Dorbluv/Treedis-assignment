import type { Finding, SavedPlan } from '../domain/types';

export const STORAGE_KEY = 'maintenance-copilot:v1:plans';

type PlanMap = Record<string, SavedPlan>;
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

export function clearPlans(storage: StorageLike = localStorage): void {
  storage.removeItem(STORAGE_KEY);
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
