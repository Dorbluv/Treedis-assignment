import { describe, expect, it } from 'vitest';
import { alerts, assets, records } from '../data';
import { machineStatus } from './floor';
import type { Alert, Asset } from './types';

const asset = (id: string) => assets.find((candidate) => candidate.id === id) as Asset;

describe('plant floor status', () => {
  it.each([
    ['M-204', 'Abnormal vibration', '8.4 mm/s'],
    ['M-310', 'Abnormal vibration', '6.2 mm/s'],
    ['F-118', 'High nozzle pressure', '3.8 bar'],
  ])('shows the alert and its reading on %s', (id, title, value) => {
    const status = machineStatus(asset(id), alerts, records);
    expect(status.alert?.title).toBe(title);
    expect(status.value).toBe(value);
  });

  it('shows no alert on machines without alert data', () => {
    for (const id of ['C-204', 'G-204']) {
      expect(machineStatus(asset(id), alerts, records).alert).toBeNull();
    }
  });

  it('picks up a new alert from data alone', () => {
    const extra: Alert = {
      id: 'ALERT-FIXTURE',
      assetId: 'G-204',
      title: 'High temperature',
      conditions: ['temperature'],
      keywords: ['temperature'],
      sensorRecordId: 'none',
      raisedAt: '2026-11-09T06:40:00',
      age: '2 h',
    };
    const status = machineStatus(asset('G-204'), [...alerts, extra], records);
    expect(status.alert?.title).toBe('High temperature');
    expect(status.value).toBe('62 °C');
  });
});
