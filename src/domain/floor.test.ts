import { describe, expect, it } from 'vitest';
import { alerts, assets, records } from '../data';
import { machineStatus } from './floor';
import type { Alert, Asset } from './types';

const asset = (id: string) => assets.find((candidate) => candidate.id === id) as Asset;

describe('plant floor status', () => {
  it('shows the alert and its reading on M-204', () => {
    const status = machineStatus(asset('M-204'), alerts, records);
    expect(status.alert?.title).toBe('Abnormal vibration');
    expect(status.value).toBe('8.4 mm/s');
  });

  it('shows no alert on machines without alert data', () => {
    for (const id of ['C-204', 'G-204', 'M-310', 'F-118']) {
      expect(machineStatus(asset(id), alerts, records).alert).toBeNull();
    }
  });

  it('picks up a new alert from data alone', () => {
    const extra: Alert = {
      id: 'ALERT-FIXTURE',
      assetId: 'M-310',
      title: 'High temperature',
      conditions: ['temperature'],
      keywords: ['temperature'],
      sensorRecordId: 'none',
    };
    const status = machineStatus(asset('M-310'), [...alerts, extra], records);
    expect(status.alert?.title).toBe('High temperature');
    expect(status.value).toBe('2.9 mm/s');
  });
});
