import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, formatDay, pageTitle } from './format';

describe('date format', () => {
  it('formats calendar dates', () => {
    expect(formatDay('2026-11-09')).toBe('9 Nov 2026');
    expect(formatDay('2024-09-03')).toBe('3 Sep 2024');
    expect(formatDay('2025-03-12')).toBe('12 Mar 2025');
  });

  it('formats moments in local time, with a 24-hour clock', () => {
    const afternoon = new Date(2026, 10, 9, 14, 22).toISOString();
    const morning = new Date(2026, 8, 3, 9, 5).toISOString();
    expect(formatDate(afternoon)).toBe('9 Nov 2026');
    expect(formatDateTime(afternoon)).toBe('9 Nov 2026, 14:22');
    expect(formatDateTime(morning)).toBe('3 Sep 2026, 09:05');
  });
});

describe('page title', () => {
  it('names the step and the machine', () => {
    expect(pageTitle('evidence', 'M-204')).toBe('Evidence, M-204, Maintenance Copilot');
    expect(pageTitle('selected', 'M-310')).toBe('Machine, M-310, Maintenance Copilot');
    expect(pageTitle('done', 'M-204')).toBe('Summary, M-204, Maintenance Copilot');
    expect(pageTitle('map', null)).toBe('Plant floor, Maintenance Copilot');
  });
});
