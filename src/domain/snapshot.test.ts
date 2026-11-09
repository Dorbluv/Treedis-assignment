import { describe, expect, it } from 'vitest';
import { alertFor, assets, dataset } from '../data';
import { retrieve } from './retrieve';
import { machineHistory, machineSnapshot } from './snapshot';

const snapshot = (id: string) => machineSnapshot(retrieve(id, alertFor(id), dataset), assets);

describe('machine snapshot', () => {
  it('summarizes M-310: reading above limit, no incidents, SOP-022 available', () => {
    const result = snapshot('M-310');
    expect(result.reading).toEqual({ text: '6.2 mm/s, above demo limit 4.5', above: true });
    expect(result.recordCount).toBe(0);
    expect(result.latestRecord).toBeNull();
    expect(result.procedure).toBe('SOP-022 rev A available');
    expect(result.connected).toBe('Standalone machine');
  });

  it('does not count a conveyor record as the motor history', () => {
    expect(machineHistory(retrieve('M-204', alertFor('M-204'), dataset)).map((record) => record.id)).not.toContain('ASM-0412');
  });

  it('summarizes M-204 with its latest incident and connected equipment', () => {
    const result = snapshot('M-204');
    expect(result.reading?.text).toBe('8.4 mm/s, above demo limit 4.5');
    expect(result.recordCount).toBe(2);
    expect(result.latestRecord?.id).toBe('INC-2291');
    expect(result.procedure).toBe('SOP-014 rev C available');
    expect(result.connected).toBe('Part of C-204, with G-204');
  });

  it('summarizes F-118 with no procedure', () => {
    const result = snapshot('F-118');
    expect(result.reading?.text).toBe('3.8 bar, above demo limit 3');
    expect(result.recordCount).toBe(1);
    expect(result.procedure).toBeNull();
  });

  it('uses the live value where a machine has no sensor record', () => {
    expect(snapshot('G-204').reading).toEqual({ text: '62 °C', above: false });
    expect(snapshot('C-204').reading).toEqual({ text: '1.4 m/s', above: false });
  });

  it('counts every record in the machine history, including the conveyor record', () => {
    expect(snapshot('G-204').recordCount).toBe(1);
    expect(snapshot('C-204').recordCount).toBe(1);
    expect(snapshot('C-204').latestRecord?.id).toBe('ASM-0412');
    expect(snapshot('C-204').connected).toBe('Includes M-204, G-204');
  });
});
