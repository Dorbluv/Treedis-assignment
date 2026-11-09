// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { records } from './data';
import type { SopRecord } from './domain/types';
import { STORAGE_KEY } from './storage/plans';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let container: HTMLDivElement;

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

async function go(hash: string) {
  await act(async () => {
    window.location.hash = hash;
    await settle();
  });
}

async function click(element: Element) {
  await act(async () => {
    (element as HTMLElement).click();
    await settle();
  });
}

function primary(): HTMLElement {
  const found = [...container.querySelectorAll('[data-primary]')];
  expect(found).toHaveLength(1);
  return found[0] as HTMLElement;
}

const heading = () => container.querySelector('h1')?.textContent;
const currentStep = () => container.querySelector('[aria-current="step"]')?.textContent;
const body = () => container.textContent ?? '';

function outcomeButton(label: string): Element {
  const button = [...container.querySelectorAll('button.outcome')].find((item) => item.textContent?.trim() === label);
  expect(button).toBeDefined();
  return button as Element;
}

async function typeNote(text: string) {
  const area = container.querySelector('textarea') as HTMLTextAreaElement;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(area, text);
    area.dispatchEvent(new Event('input', { bubbles: true }));
    await settle();
  });
}

beforeEach(async () => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  localStorage.clear();
  window.location.hash = '';
  container = document.body.appendChild(document.createElement('div'));
  root = createRoot(container);
  await act(async () => {
    root.render(<App />);
    await settle();
  });
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

describe('one action per screen', () => {
  it('shows the Finding screen immediately after saving the plan', async () => {
    await go('#/asset/M-204/plan');
    expect(heading()).toBe('Review and save inspection plan');
    expect(primary().textContent).toBe('Save inspection plan');

    await click(primary());

    expect(window.location.hash).toBe('#/asset/M-204/finding');
    expect(heading()).toBe('Record finding');
    expect(container.querySelector('.confirm')?.textContent).toContain('Plan saved');
    expect(currentStep()).toContain('Finding');
    expect([...container.querySelectorAll('button.outcome')].map((item) => item.textContent?.trim())).toEqual([
      'Bearing wear',
      'Lubrication problem',
      'Neither',
      'Inconclusive',
    ]);
    expect(primary().textContent).toBe('Save finding');
    expect((primary() as HTMLButtonElement).disabled).toBe(true);
  });

  it('walks the whole flow with exactly one primary action on each screen', async () => {
    expect(primary().textContent).toBe('Open M-204 alert');
    expect(currentStep()).toContain('Machine');

    await click(primary());
    expect(primary().textContent).toBe('Review evidence');
    expect(container.querySelector('.relations')?.textContent).toContain('G-204');

    await click(primary());
    expect(primary().textContent).toBe('Continue to inspection plan');
    expect(currentStep()).toContain('Evidence');

    await click(primary());
    expect(currentStep()).toContain('Plan');
    expect(container.querySelector('.steps li')?.textContent).toMatch(/isolate and lock out/i);
    expect(container.querySelector('details')?.hasAttribute('open')).toBe(false);

    await click(primary());
    await click(outcomeButton('Bearing wear'));
    await typeNote('Rough running');
    expect([...container.querySelectorAll('button')].map((item) => item.textContent)).not.toContain('Save note');

    await click(primary());
    expect(window.location.hash).toBe('#/asset/M-204/done');
    expect(primary().textContent).toBe('Back to plant layout');
    expect(body()).toContain('SOP-014 rev C');
    expect(body()).toContain('Bearing wear');
    expect(body()).toContain('Rough running');
    expect(container.querySelector('[aria-current="step"]')).toBeNull();

    await click(primary());
    expect(heading()).toBe('Plant floor');
  });

  it('gives a source screen one action back to where it opened', async () => {
    await go('#/asset/M-204/evidence/source/INC-2310');
    expect(primary().textContent).toBe('Back to evidence');
    expect(container.querySelector('dl')?.textContent).toContain('Keyword match');
  });

  it('does not open the Finding screen before a plan is saved', async () => {
    await go('#/asset/M-204/finding');
    expect(heading()).toBe('Review and save inspection plan');
  });
});

describe('Evidence screen', () => {
  beforeEach(() => go('#/asset/M-204/evidence'));

  it('puts the alert and readings before the separating sentence and the evidence groups', () => {
    const text = body();
    const order = ['Abnormal vibration on M-204', 'Demo limits. Last 48 hours.', 'Neither is confirmed. Steps 2 and 3 tell them apart.', 'Used as evidence'].map(
      (part) => text.indexOf(part),
    );
    expect(order.every((position) => position >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('shows computed status for each reading', () => {
    const statuses = [...container.querySelectorAll('.meter-status')].map((item) => item.textContent);
    expect(statuses).toEqual(['Above limit 4.5', 'Above limit 75', 'Within limit 14']);
  });

  it('shows no ranking or confidence', () => {
    expect(container.querySelector('.compare')?.textContent).not.toMatch(/%|most likely|confidence/i);
  });

  it('links the alignment line to the SOP step and ASM-0412', () => {
    const line = [...container.querySelectorAll('.note-line')].find((item) => item.textContent?.includes('alignment'));
    expect(line?.textContent).toBe('Step 4 also checks alignment. No past incident on this motor points to it.');
    const hrefs = [...(line?.querySelectorAll('a') ?? [])].map((link) => link.getAttribute('href'));
    expect(hrefs).toEqual([
      '#/asset/M-204/evidence/source/SOP-014-C/step/SOP-014-C-4',
      '#/asset/M-204/evidence/source/ASM-0412',
    ]);
  });

  it('collapses every group by default, with a count and preview', () => {
    const groups = [...container.querySelectorAll('.groups details')];
    expect(groups).toHaveLength(3);
    for (const group of groups) expect(group.hasAttribute('open')).toBe(false);
    expect([...container.querySelectorAll('.groups .group-title')].map((item) => item.textContent)).toEqual([
      'Used as evidence (5)',
      'Not sure it applies (1)',
      'Left out (2)',
    ]);
    expect(groups[2].querySelector('.group-preview')?.textContent).toBe('Gearbox report that mentions vibration, older procedure');
  });

  it('opens Left out from the summary line, keeping the INC-2310 keyword and reason', async () => {
    const leftOut = container.querySelector('#left-out') as HTMLDetailsElement;
    expect(leftOut.open).toBe(false);
    await click(container.querySelector('.text-button') as Element);
    expect(leftOut.open).toBe(true);
    expect(leftOut.querySelectorAll('.row')).toHaveLength(2);
    const row = [...leftOut.querySelectorAll('.row-excluded')].find((item) => item.textContent?.includes('INC-2310'));
    expect(row?.querySelector('mark')?.textContent).toBe('vibration');
    expect(row?.textContent).toContain('does not link to M-204');
  });

  it('removes the prose rows from the cause cards', () => {
    const cards = [...container.querySelectorAll('.cause')];
    expect(cards).toHaveLength(2);
    expect(cards[0].textContent).toContain('12 Mar 2025');
    expect(cards[0].textContent).toContain('6.5 h');
    expect(cards[0].querySelector('.check')?.textContent).toBe('Check: Step 2, feel for rough running or play');
    expect(container.querySelector('.compare')?.textContent).not.toMatch(/Unconfirmed|Why it is on the list/);
  });

  it('shows no generic reason on included rows, and keeps it as relevance in the source', async () => {
    const generic = 'Recorded against M-204, the selected asset.';
    const included = [...container.querySelectorAll('.row-included')];
    expect(included).toHaveLength(5);
    for (const row of included) expect(row.textContent).not.toContain(generic);
    expect(included.map((row) => row.querySelector('.tag')?.textContent)).toContain('Direct asset history');

    await go('#/asset/M-204/evidence/source/INC-2291');
    expect(container.querySelector('dl')?.textContent).toContain(generic);
  });
});

describe('Plan screen', () => {
  const languageButton = (label: string) =>
    [...container.querySelectorAll('.switch button')].find((item) => item.textContent === label) as HTMLElement;

  beforeEach(() => go('#/asset/M-204/plan'));

  it('shows numbered steps with titles and compact expected results', () => {
    expect(container.querySelector('.plan h2')?.textContent).toBe('Inspection steps (5)');
    expect([...container.querySelectorAll('.step-title')].map((item) => item.textContent)).toEqual([
      'Lock out the motor',
      'Check the bearing',
      'Check lubrication',
      'Check alignment',
      'Record and release',
    ]);
    const checks = [...container.querySelectorAll('.step-check')].map((item) => item.textContent);
    expect(checks).toContain('Good: smooth, no play');
    expect(checks).toContain('If not: points to bearing wear');
  });

  it('switches the whole plan to German, with nothing added below the English', async () => {
    expect(languageButton('English').getAttribute('aria-pressed')).toBe('true');
    await click(languageButton('Deutsch'));
    expect(languageButton('Deutsch').getAttribute('aria-pressed')).toBe('true');
    const plan = container.querySelector('.plan') as HTMLElement;
    expect(plan.getAttribute('lang')).toBe('de');
    expect(plan.textContent).toContain('Inspektionsschritte (5)');
    expect(plan.textContent).toContain('Motor freischalten und sichern');
    expect(plan.textContent).toContain('Gut: gleichmäßig, kein Spiel');
    expect(plan.textContent).not.toMatch(/Lock out|Isolate and lock out|Check the bearing|Good:/);
  });

  it('has a German title and expected result wherever there is an English one', () => {
    const sop = records.find((record) => record.id === 'SOP-014-C') as SopRecord;
    for (const step of sop.steps) {
      expect(step.title).toBeTruthy();
      expect(step.titleGerman).toBeTruthy();
      expect(Boolean(step.goodEnglish)).toBe(Boolean(step.goodGerman));
      expect(Boolean(step.ifNotEnglish)).toBe(Boolean(step.ifNotGerman));
    }
  });
});

describe('Finding screen', () => {
  beforeEach(async () => {
    await go('#/asset/M-204/plan');
    await click(primary());
  });

  const area = () => container.querySelector('textarea') as HTMLTextAreaElement;
  const chips = () => [...container.querySelectorAll('.chip')];

  it('starts with an empty note and no suggestions', () => {
    expect(area().value).toBe('');
    expect(area().placeholder).toBe('Add a note');
    expect(chips()).toHaveLength(0);
  });

  it('marks the selected outcome for screen readers and offers suggestions without prefilling', async () => {
    await click(outcomeButton('Bearing wear'));
    const pressed = [...container.querySelectorAll('.outcome[aria-pressed="true"]')];
    expect(pressed.map((item) => item.textContent?.trim())).toEqual(['Bearing wear']);
    expect(pressed[0].querySelector('svg')).not.toBeNull();
    expect(area().value).toBe('');
    expect(chips().map((chip) => chip.textContent)).toContain('Play at drive-end bearing');

    await click(chips()[0]);
    expect(area().value).toBe('Play at drive-end bearing');
  });
});

describe('Plant floor', () => {
  it('shows each machine in its line, with the alert from data', () => {
    const zone2 = container.querySelector('.zone-2') as HTMLElement;
    for (const id of ['C-204', 'M-204', 'G-204', 'M-310']) expect(zone2.textContent).toContain(id);
    expect(container.querySelectorAll('.zone-2 .zone-name')).toHaveLength(1);
    expect(container.querySelector('.zone-1')?.textContent).toContain('F-118');
    const alertMachines = [...container.querySelectorAll('.machine.has-alert')];
    expect(alertMachines).toHaveLength(1);
    expect(alertMachines[0].textContent).toContain('8.4 mm/s');
    expect(alertMachines[0].textContent).toContain('Abnormal vibration');
  });

  it('marks the selected machine and uses plain words for related ones', async () => {
    await go('#/asset/M-204');
    expect(container.querySelector('.machine[aria-pressed="true"]')?.textContent).toContain('M-204');
    expect(container.querySelector('.machine.is-sibling')?.textContent).toContain('Gearbox on the same conveyor');
  });
});

describe('Reset demo', () => {
  it('clears saved data from the summary and returns to the plant floor', async () => {
    await go('#/asset/M-204/plan');
    await click(primary());
    await click(outcomeButton('Neither'));
    await click(primary());
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();

    await click(container.querySelector('button.reset') as Element);

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(heading()).toBe('Plant floor');
    expect(container.querySelector('button.reset')).toBeNull();
    await go('#/asset/M-204/plan');
    expect(primary().textContent).toBe('Save inspection plan');
  });

  it('appears on Home only when saved data exists', async () => {
    expect(container.querySelector('button.reset')).toBeNull();
    await go('#/asset/M-204/plan');
    await click(primary());
    await go('#/');
    expect(container.querySelector('button.reset')).not.toBeNull();
  });
});
