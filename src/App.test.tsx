// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
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
    expect(container.querySelectorAll('.note button')).toHaveLength(0);

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
    const order = ['Abnormal vibration on M-204', 'Limits are demonstration values', 'Neither is confirmed. Steps 2 and 3', 'Used as evidence'].map(
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
    expect(line?.textContent).toBe(
      'Step 4 also checks alignment because of a conveyor-level record. It is not listed as a cause because no incident on this motor supports it.',
    );
    const hrefs = [...(line?.querySelectorAll('a') ?? [])].map((link) => link.getAttribute('href'));
    expect(hrefs).toEqual([
      '#/asset/M-204/evidence/source/SOP-014-C/step/SOP-014-C-4',
      '#/asset/M-204/evidence/source/ASM-0412',
    ]);
  });

  it('shows the left-out summary, and keeps INC-2310 visible with its keyword and reason', () => {
    expect(container.querySelector('.text-button')?.textContent).toBe(
      '1 record left out: gearbox report that also mentions vibration.',
    );
    const row = [...container.querySelectorAll('.row-excluded')].find((item) => item.textContent?.includes('INC-2310'));
    expect(row?.querySelector('mark')?.textContent).toBe('vibration');
    expect(row?.textContent).toContain('does not link to M-204');
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
  it('keeps German one tap away', async () => {
    await go('#/asset/M-204/plan');
    expect(container.querySelector('.german')).toBeNull();
    await click([...container.querySelectorAll('button')].find((item) => item.textContent === 'Show German text') as Element);
    expect(container.querySelector('.german')?.textContent).toContain('freischalten');
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
