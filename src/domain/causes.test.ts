import { describe, expect, it } from 'vitest';
import { alertFor, assets, dataset } from '../data';
import {
  causeComparison,
  contextStepNotes,
  keywordExclusions,
  leftOutSummary,
  readingStatus,
  separatingSentence,
} from './causes';
import { retrieve } from './retrieve';

const result = retrieve('M-204', alertFor('M-204'), dataset);
const typeOf = (id: string) => assets.find((asset) => asset.id === id)?.type ?? '';

describe('cause comparison', () => {
  const items = causeComparison(result);

  it('covers every possible cause and nothing else', () => {
    expect(items.map((item) => item.cause.recordId)).toEqual(result.possibleCauses.map((cause) => cause.recordId));
    expect(items).toHaveLength(2);
  });

  it('links each cause to a real step in the applicable SOP', () => {
    const stepIds = result.applicableSop?.steps.map((step) => step.id) ?? [];
    for (const item of items) {
      expect(stepIds).toContain(item.record.testedByStepId);
      expect(item.step.id).toBe(item.record.testedByStepId);
      expect(item.step.expectedEnglish).toBeTruthy();
      expect(item.step.expectedOriginal).toBeTruthy();
    }
  });

  it('has the display fields each column needs', () => {
    for (const { record } of items) {
      expect(record.occurredOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(record.alertMatch).toBeTruthy();
      expect(record.foundCondition).toBeTruthy();
      expect(record.fix).toBeTruthy();
      expect(record.downtimeHours).toBeGreaterThan(0);
      expect(record.symptoms?.length).toBeGreaterThan(0);
    }
  });

  it('builds the separating sentence from the linked steps', () => {
    expect(separatingSentence(items)).toBe('Neither is confirmed. Steps 2 and 3 of the inspection separate them.');
  });
});

describe('alignment note', () => {
  it('names step 4 and ASM-0412, and stays out of the causes', () => {
    expect(contextStepNotes(result)).toEqual([
      {
        stepId: 'SOP-014-C-4',
        stepNumber: 4,
        checks: 'alignment',
        recordId: 'ASM-0412',
        parentType: 'conveyor',
        assetType: 'motor',
      },
    ]);
    expect(result.possibleCauses.map((cause) => cause.recordId)).not.toContain('ASM-0412');
  });
});

describe('left-out summary', () => {
  it('counts only the keyword match, not the superseded SOP', () => {
    expect(keywordExclusions(result).map((item) => item.record.id)).toEqual(['INC-2310']);
    expect(leftOutSummary(result, typeOf)).toBe('1 record left out: gearbox report that also mentions vibration.');
  });
});

describe('readings', () => {
  it('computes status from value and limit', () => {
    expect(readingStatus({ value: 8.4, limit: 4.5 })).toBe('above');
    expect(readingStatus({ value: 12.1, limit: 14 })).toBe('within');
    expect(readingStatus({ value: 14, limit: 14 })).toBe('within');
  });

  it('ends each history on the current value, with the specified values', () => {
    const readings = result.included.find((item) => item.record.id === 'SR-M204-01')?.record.readings ?? [];
    expect(readings.map((reading) => [reading.value, reading.limit])).toEqual([
      [8.4, 4.5],
      [78, 75],
      [12.1, 14],
    ]);
    expect(readings.map(readingStatus)).toEqual(['above', 'above', 'within']);
    for (const reading of readings) expect(reading.history.at(-1)).toBe(reading.value);
  });
});
