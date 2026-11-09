import { readingStatus } from './causes';
import type { Alert, Asset, MaintenanceRecord } from './types';

export interface MachineStatus {
  alert: Alert | null;
  value: string | null;
}

/** Status comes from alert data alone, so any new alert shows on the floor automatically. */
export function machineStatus(asset: Asset, alerts: Alert[], records: MaintenanceRecord[]): MachineStatus {
  const alert = alerts.find((candidate) => candidate.assetId === asset.id) ?? null;
  const sensor = records.find((record) => record.kind === 'sensor' && record.assetId === asset.id && record.readings);
  const readings = sensor?.readings ?? [];
  const reading = readings.find((item) => readingStatus(item) === 'above') ?? readings[0];
  return {
    alert,
    value: reading ? `${reading.value} ${reading.unit}` : asset.liveValue ?? null,
  };
}
