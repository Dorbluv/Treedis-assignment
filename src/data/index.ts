import type { Alert, Asset, Dataset, MaintenanceRecord } from '../domain/types';
import assetsJson from './assets.json';
import recordsJson from './records.json';
import alertsJson from './alerts.json';

export const assets = assetsJson as Asset[];
export const records = recordsJson as MaintenanceRecord[];
export const alerts = alertsJson as Alert[];
export const dataset: Dataset = { assets, records };

export function alertFor(assetId: string): Alert | null {
  return alerts.find((alert) => alert.assetId === assetId) ?? null;
}
