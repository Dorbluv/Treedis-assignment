import { describe, expect, it } from 'vitest';
import { alertFor, dataset } from '../data';
import { retrieve } from './retrieve';
import { INSUFFICIENT_SENTENCE, preparedSummary, validateSummary, type SummaryRule } from './summary';

const result = (id: string) => retrieve(id, alertFor(id), dataset);
const one = (text: string, ...citations: string[]) => ({ sentences: [{ text, citations }] });

function rules(raw: unknown, id = 'M-204'): SummaryRule[] {
  const validated = validateSummary(raw, result(id));
  return validated.ok ? [] : validated.failures.map((failure) => failure.rule);
}

describe('accepted summaries', () => {
  it('accepts a hedged, cited summary', () => {
    const raw = {
      sentences: [
        { text: 'Vibration is 8.4 mm/s against a demo limit of 4.5.', citations: ['SR-M204-01'] },
        { text: 'Past records list bearing wear and low lubricant as possible causes.', citations: ['INC-2291', 'INC-1877'] },
        { text: 'Neither cause is confirmed.', citations: ['INC-2291', 'INC-1877'] },
      ],
    };
    expect(validateSummary(raw, result('M-204')).ok).toBe(true);
  });

  it('accepts the required M-310 statement', () => {
    expect(validateSummary(one(INSUFFICIENT_SENTENCE, 'SR-M310-01'), result('M-310')).ok).toBe(true);
  });

  it('accepts a German decimal comma when the record has that number', () => {
    expect(rules(one('Vibration is 8,4 mm/s.', 'SR-M204-01'))).toEqual([]);
  });
});

describe('shape', () => {
  it.each([
    ['null', null],
    ['no sentences', { sentences: [] }],
    ['four sentences', { sentences: Array(4).fill({ text: 'Vibration is high.', citations: ['SR-M204-01'] }) }],
    ['no citations', one('Vibration is high.')],
    ['empty text', one(' ', 'SR-M204-01')],
  ])('rejects %s', (_name, raw) => {
    expect(rules(raw)).toEqual(['shape']);
  });

  it('rejects an over-long sentence and two sentences in one entry', () => {
    expect(rules(one(`Vibration is high ${'and rising '.repeat(14)}here.`, 'SR-M204-01'))).toContain('shape');
    expect(rules(one('Vibration is high. Temperature is high.', 'SR-M204-01'))).toContain('shape');
  });
});

describe('citations', () => {
  it('rejects INC-2310 on M-204, which retrieval left out', () => {
    expect(rules(one('Vibration was noted on the gearbox.', 'INC-2310'))).toContain('citation');
  });

  it('rejects uncertain and superseded records, and invented IDs', () => {
    expect(rules(one('A motor on line 2 was noisy.', 'NOTE-5521'))).toContain('citation');
    expect(rules(one('An older procedure exists.', 'SOP-014-B'))).toContain('citation');
    expect(rules(one('A record says so.', 'INC-9999'))).toContain('citation');
  });

  it('requires a named cause to cite its own record', () => {
    expect(rules(one('Past records list bearing wear as possible.', 'INC-1877'))).toContain('citation');
  });
});

describe('numbers', () => {
  it('rejects a number in no cited record', () => {
    expect(rules(one('Vibration is 9.7 mm/s.', 'SR-M204-01'))).toContain('number');
  });

  it('rejects a real number from a record that is not cited', () => {
    expect(rules(one('Downtime in a past record was 6.5 hours.', 'SR-M204-01'))).toContain('number');
  });

  it('rejects an invented count written as a word', () => {
    expect(rules(one('Past records show three possible events.', 'SR-M204-01'))).toContain('number');
  });

  it('does not read digits in IDs as numbers', () => {
    expect(rules(one('Vibration on M-204 is high.', 'SR-M204-01'))).toEqual([]);
  });

  it('accepts a date from the cited record', () => {
    expect(rules(one('Past records list bearing wear in 2025.', 'INC-2291'))).toEqual([]);
  });
});

describe('diagnosis', () => {
  it.each([
    'Bearing wear is confirmed.',
    'The cause is bearing wear.',
    'The bearing is worn.',
    'This is definitely bearing wear.',
    'Bearing wear is the diagnosis.',
  ])('rejects: %s', (text) => {
    expect(rules(one(text, 'INC-2291'))).toContain('diagnosis');
  });

  it('rejects a named cause with no hedge', () => {
    expect(rules(one('Bearing wear explains this vibration.', 'INC-2291'))).toContain('diagnosis');
  });

  it('allows saying a cause is not confirmed', () => {
    expect(rules(one('Bearing wear is possible but not confirmed.', 'INC-2291'))).toEqual([]);
  });
});

describe('causes', () => {
  it.each([
    ['M-204', 'Past records list misalignment as possible.', 'INC-2291'],
    ['M-204', 'A possible oil seal leak was recorded.', 'INC-2291'],
    ['M-204', 'Past records list nozzle blockage as possible.', 'INC-2291'],
    ['F-118', 'Past records list bearing wear as possible.', 'INC-1650'],
    ['M-204', 'The vibration may be caused by a cracked gremlin.', 'INC-2291'],
    ['M-204', 'The alert is likely due to gremlins.', 'INC-2291'],
  ])('rejects a cause outside the list on %s: %s', (id, text, citation) => {
    expect(rules(one(text, citation), id)).toContain('cause');
  });
});

describe('instructions', () => {
  it.each([
    'Check the bearing for play.',
    'Technicians should lock out the motor.',
    'Lock out the motor first.',
    'Step 2 tests the bearing.',
    'We recommend replacing the bearing.',
  ])('rejects: %s', (text) => {
    expect(rules(one(text, 'SOP-014-C'))).toContain('instruction');
  });
});

describe('M-310', () => {
  it('must state that evidence is insufficient', () => {
    expect(rules(one('Vibration is 6.2 mm/s.', 'SR-M310-01'), 'M-310')).toContain('insufficient');
  });

  it('must name no cause', () => {
    const raw = { sentences: [{ text: INSUFFICIENT_SENTENCE, citations: ['SR-M310-01'] }, { text: 'Bearing wear is possible.', citations: ['SR-M310-01'] }] };
    expect(rules(raw, 'M-310')).toContain('cause');
  });
});

describe('prepared summary', () => {
  it.each(['M-204', 'M-310', 'F-118'])('passes every rule on %s', (id) => {
    expect(validateSummary({ sentences: preparedSummary(result(id)) }, result(id))).toMatchObject({ ok: true });
  });

  it('names causes only as possible on M-204', () => {
    expect(preparedSummary(result('M-204')).map((sentence) => sentence.text)).toEqual([
      'Vibration is 8.4 mm/s (demo limit 4.5) and temperature is 78 °C (demo limit 75).',
      'Past records list bearing wear and lubrication problem as possible causes.',
      'Neither is confirmed.',
    ]);
  });

  it('states insufficient evidence on M-310 and names no cause', () => {
    const sentences = preparedSummary(result('M-310'));
    expect(sentences.map((sentence) => sentence.text)).toContain(INSUFFICIENT_SENTENCE);
    expect(sentences.flatMap((sentence) => sentence.citations)).not.toContain('NOTE-5521');
  });
});
