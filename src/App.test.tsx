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

function primaries() {
  return [...container.querySelectorAll('[data-primary]')];
}

function primary(): HTMLElement {
  expect(primaries()).toHaveLength(1);
  return primaries()[0] as HTMLElement;
}

const heading = () => container.querySelector('h1')?.textContent;
const currentStep = () => container.querySelector('[aria-current="step"]')?.textContent;

function outcomeButton(label: string): Element {
  const button = [...container.querySelectorAll('button.outcome')].find((item) => item.textContent === label);
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
    expect([...container.querySelectorAll('button.outcome')].map((item) => item.textContent)).toEqual([
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
    const text = container.textContent ?? '';
    expect(text.indexOf('Possible causes')).toBeLessThan(text.indexOf('Used as evidence'));
    expect(text).toContain('INC-2310');
    expect(container.querySelector('mark')?.textContent).toBe('vibration');

    await click(primary());
    expect(currentStep()).toContain('Plan');
    expect(container.querySelector('.steps li')?.textContent).toMatch(/isolate and lock out/i);
    expect(container.querySelector('details')?.hasAttribute('open')).toBe(false);

    await click(primary());
    await click(outcomeButton('Bearing wear'));
    await typeNote('Rough running');
    expect(container.querySelectorAll('textarea + button, .note button')).toHaveLength(0);

    await click(primary());
    expect(window.location.hash).toBe('#/asset/M-204/done');
    expect(primary().textContent).toBe('Back to plant layout');
    const summary = container.textContent ?? '';
    expect(summary).toContain('SOP-014 rev C');
    expect(summary).toContain('INC-2291');
    expect(summary).toContain('Bearing wear');
    expect(summary).toContain('Rough running');
    expect(container.querySelector('[aria-current="step"]')).toBeNull();

    await click(primary());
    expect(heading()).toBe('Plant layout');
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

describe('Reset demo', () => {
  it('clears saved data and returns to the plant layout', async () => {
    await go('#/asset/M-204/plan');
    await click(primary());
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();

    await click(container.querySelector('button.reset') as Element);

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(heading()).toBe('Plant layout');
    await go('#/asset/M-204/plan');
    expect(primary().textContent).toBe('Save inspection plan');
  });
});
