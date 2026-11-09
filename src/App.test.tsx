// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { alertFor, alerts, dataset } from './data';
import { retrieve } from './domain/retrieve';
import { ESCALATIONS_KEY, STORAGE_KEY } from './storage/plans';
import { resetSummaryRequests } from './components/SummaryCard';
import { preparedSummary } from './domain/summary';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let container: HTMLDivElement;

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

/** The hash the app has been told about. jsdom fires hashchange later than it updates the URL. */
let deliveredHash = '';
const trackHash = () => {
  deliveredHash = window.location.hash;
};

/** A fixed wait loses this race on a busy machine, so wait for the navigation to arrive. */
async function navigationArrived(target?: string | null) {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline && (deliveredHash !== window.location.hash || (target != null && deliveredHash !== target))) {
    await settle();
  }
}

async function go(hash: string) {
  await act(async () => {
    window.location.hash = hash;
    await settle();
    await navigationArrived(hash);
  });
}

async function click(element: Element) {
  const target = element.matches('a[href^="#"]') ? element.getAttribute('href') : null;
  await act(async () => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await settle();
    await navigationArrived(target);
  });
}

async function press(element: Element, key: string) {
  await act(async () => {
    element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    await settle();
    await navigationArrived();
  });
}

async function mount() {
  root = createRoot(container);
  await act(async () => {
    root.render(<App />);
    await settle();
  });
}

function primary(): HTMLElement {
  const found = [...container.querySelectorAll('.panel-body > .action-bar [data-primary]')];
  expect(found).toHaveLength(1);
  return found[0] as HTMLElement;
}

const heading = () => container.querySelector('h1')?.textContent;
const body = () => container.textContent ?? '';
const panelText = () => [...container.querySelectorAll('.panel-head, .panel-body')].map((el) => el.textContent).join(' ');
const tab = (key: string) => container.querySelector(`#tab-${key}`) as HTMLElement;
const selectedTab = () => container.querySelector('[role="tab"][aria-selected="true"]')?.textContent;
const pills = () => [...container.querySelectorAll('.pill')].map((pill) => pill.textContent);
const currentPill = () => container.querySelector('.pill-current')?.textContent;
const machineButton = (id: string) =>
  [...container.querySelectorAll('.iso-machine')].find((el) => el.getAttribute('aria-label')?.includes(id)) as HTMLElement;
const groupTitles = () => [...container.querySelectorAll('.records .group-title')].map((el) => el.textContent);

function outcomeButton(label: string): Element {
  const button = [...container.querySelectorAll('button.outcome')].find((item) => item.textContent?.trim() === label);
  expect(button).toBeDefined();
  return button as Element;
}

function languageButton(label: string): Element {
  return [...container.querySelectorAll('.switch button')].find((item) => item.textContent === label) as Element;
}

async function savePlanFor(assetId: string) {
  await go(`#/asset/${assetId}/plan`);
  await click(primary());
}

async function saveFindingFor(assetId: string, outcome: string) {
  await savePlanFor(assetId);
  await click(outcomeButton(outcome));
  await click(primary());
}

beforeEach(async () => {
  resetSummaryRequests();
  vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline in tests'); }));
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  localStorage.clear();
  window.location.hash = '';
  await settle();
  trackHash();
  window.addEventListener('hashchange', trackHash);
  container = document.body.appendChild(document.createElement('div'));
  await mount();
});

afterEach(async () => {
  await act(async () => root.unmount());
  window.removeEventListener('hashchange', trackHash);
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('home', () => {
  it('lists every active alert with one primary action', () => {
    expect(heading()).toBe(`${alerts.length} active alerts`);
    expect(container.querySelectorAll('.alert-row')).toHaveLength(alerts.length);
    expect(primary().textContent).toBe('Open M-204 alert');
    expect(primary().getAttribute('href')).toBe('#/asset/M-204');
    expect(container.querySelector('[role="tablist"]')).toBeNull();
  });

  it('puts M-204 first in the queue, with age and the demo text', () => {
    const items = [...container.querySelectorAll('.queue-item')];
    expect(items).toHaveLength(alerts.length);
    expect(items[0].textContent).toContain('M-204');
    expect(items[0].textContent).toContain('2 h');
    expect(container.querySelector('.topbar')?.textContent).toContain('Demo with synthetic data. Not for operational use.');
  });

  it('shows one legend with every status in use', () => {
    const legends = container.querySelectorAll('.legend');
    expect(legends).toHaveLength(1);
    expect([...legends[0].querySelectorAll('li')].map((item) => item.textContent?.trim())).toEqual([
      'No alert',
      'Alert',
      'Selected',
      'Inspected',
      'Escalated',
    ]);
  });
});

describe('plant floor', () => {
  it('makes every machine a focusable, named button', () => {
    const machines = [...container.querySelectorAll('.iso-machine')];
    expect(machines).toHaveLength(dataset.assets.length);
    for (const asset of dataset.assets) {
      const button = machineButton(asset.id);
      expect(button.getAttribute('role')).toBe('button');
      expect(button.getAttribute('tabindex')).toBe('0');
      expect(button.getAttribute('aria-label')).toContain(asset.name);
    }
  });

  it('opens a machine with click and with the keyboard', async () => {
    await click(machineButton('M-310'));
    expect(heading()).toBe('M-310 abnormal vibration');
    await act(async () => {
      machineButton('G-204').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await settle();
      await navigationArrived('#/asset/G-204');
    });
    expect(container.querySelector('.status-line')?.textContent).toBe('No active alert');
  });

  it('gives only the selected machine the coral body and outlines what is connected', async () => {
    await go('#/asset/M-204');
    expect(container.querySelectorAll('.iso-machine.is-selected')).toHaveLength(1);
    expect(machineButton('M-204').getAttribute('aria-pressed')).toBe('true');
    expect(machineButton('C-204').classList.contains('is-connected')).toBe(true);
    expect(machineButton('G-204').classList.contains('is-connected')).toBe(true);
    expect(machineButton('M-310').classList.contains('is-connected')).toBe(false);
  });

  it('shows a coral triangle only on labels of machines with an unanswered alert', async () => {
    expect(container.querySelectorAll('.label-triangle')).toHaveLength(alerts.length);
    await saveFindingFor('M-204', 'Bearing wear');
    expect(container.querySelectorAll('.label-triangle')).toHaveLength(alerts.length - 1);
    expect(container.querySelectorAll('.label-inspected')).toHaveLength(1);
  });
});

describe('selection color', () => {
  const CORAL_TOP = '#FF8F7E';
  const fills = (id: string) => [...machineButton(id).querySelectorAll('polygon')].map((face) => face.getAttribute('fill'));
  const coralFaces = ['#FF8F7E', '#BF5A4C', '#94433A'];

  it.each(['G-204', 'C-204'])('never gives %s coral, because it has no alert', async (id) => {
    await go(`#/asset/${id}`);
    expect(machineButton(id).getAttribute('aria-pressed')).toBe('true');
    expect(fills(id).some((fill) => coralFaces.includes(fill as string))).toBe(false);
    expect(fills(id)[0]).toBe('#5FBDB2');
    expect(machineButton(id).querySelector('polygon')?.getAttribute('stroke')).toBe('#7FE0D3');
  });

  it.each(['M-204', 'M-310', 'F-118'])('keeps coral on %s, which has an active alert', async (id) => {
    await go(`#/asset/${id}`);
    expect(fills(id)[0]).toBe(CORAL_TOP);
  });

  it('keeps coral after a finding, because the alert is still active', async () => {
    await saveFindingFor('M-204', 'Bearing wear');
    expect(fills('M-204')[0]).toBe(CORAL_TOP);
  });

  it('shows both selection colors in the one legend entry', () => {
    const item = [...container.querySelectorAll('.legend li')].find((li) => li.textContent?.trim() === 'Selected') as Element;
    expect(item.querySelector('.mark-selected')).not.toBeNull();
    expect(item.querySelector('.mark-selected-clear')).not.toBeNull();
  });
});

describe('alert time', () => {
  const strip = () => [...container.querySelectorAll('.activity-list li')].map((item) => item.textContent?.trim());

  it('shows computed relative ages in the queue', () => {
    expect([...container.querySelectorAll('.queue-age')].map((age) => age.textContent)).toEqual(['2 h', '5 h', '20 h']);
  });

  it('shows alerts in the activity strip as relative time, with no fixed date', () => {
    expect(strip()).toEqual([
      '2 h ago M-204 abnormal vibration',
      '5 h ago M-310 abnormal vibration',
      '20 h ago F-118 high nozzle pressure',
    ]);
  });

  it('keeps real timestamps for saved actions', async () => {
    await savePlanFor('M-204');
    const year = String(new Date().getFullYear());
    expect(strip()[0]).toContain(year);
    expect(strip()[0]).toContain('M-204 plan saved');
    expect(strip()[1]).toBe('2 h ago M-204 abnormal vibration');
  });
});

describe('machine details', () => {
  const details = () => container.querySelector('.machine-details') as HTMLDetailsElement;

  it.each(['M-204', 'M-310', 'F-118'])('is one closed row on %s', async (id) => {
    await go(`#/asset/${id}`);
    expect(details().querySelector('summary')?.textContent).toBe('Machine details');
    expect(details().open).toBe(false);
  });

  it.each(['G-204', 'C-204'])('stays open on %s', async (id) => {
    await go(`#/asset/${id}`);
    expect(details().open).toBe(true);
  });

  it('keeps the M-310 no-incidents fact visible next to the evidence message', async () => {
    await go('#/asset/M-310');
    const line = container.querySelector('.tabpanel .insufficient') as HTMLElement;
    expect(line.textContent).toContain('Insufficient asset-specific evidence to recommend a likely cause.');
    expect(line.textContent).toContain('No past incidents on this machine');
    expect(line.closest('details')).toBeNull();
  });
});

describe('action bar', () => {
  const next = () => container.querySelector('.action-next')?.textContent;

  it('sits outside the title row and the scrolling content', async () => {
    await go('#/asset/M-204');
    expect(container.querySelector('.panel-head [data-primary]')).toBeNull();
    expect(container.querySelector('.panel-scroll .action-bar')).toBeNull();
    expect(container.querySelector('.panel-scroll [data-primary]')).toBeNull();
  });

  it('gives each state one action and a Next hint', async () => {
    expect(next()).toBe('Next: start with the newest alert');
    await go('#/asset/M-204');
    expect(next()).toBe('Next: check the inspection steps');
    await click(primary());
    expect(next()).toBe('Next: do the steps, then record a finding');
    await click(primary());
    expect(next()).toBe('Pick one to save');
    await click(outcomeButton('Bearing wear'));
    expect(next()).toBe('Next: record what you found');
    await click(primary());
    expect(next()).toBe('Next: repair needed');
    expect(primary().textContent).toBe('Back to plant floor');
  });

  it.each([
    ['Inconclusive', 'Next: reinspect or escalate'],
    ['Neither', 'Next: escalate through the site process'],
  ])('shows the next step for %s', async (outcome, text) => {
    await saveFindingFor('M-204', outcome);
    expect(next()).toBe(text);
  });

  it('shows the escalation path on F-118, and a plain hint on machines with no alert', async () => {
    await go('#/asset/F-118');
    expect(next()).toBe('Next: send it to site review');
    await click(primary());
    expect(next()).toBe('Next: wait for site review');
    await go('#/asset/G-204');
    expect(next()).toBe('Next: choose a machine with an alert');
  });
});

describe('evidence summary', () => {
  const summary = () => container.querySelector('.summary') as HTMLElement;
  const label = () => container.querySelector('.summary-label')?.textContent;
  const reply = (body: unknown) => vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })));
  const GEMINI = {
    source: 'gemini',
    sentences: [{ text: 'Past records list bearing wear as possible.', citations: ['INC-2291'] }],
  };

  it('shows a model summary directly under the readings, labeled, with tappable citations', async () => {
    reply(GEMINI);
    await go('#/asset/M-204');
    await act(settle);
    expect(summary().previousElementSibling?.classList.contains('readings')).toBe(true);
    expect(label()).toBe('Generated by Gemini from the records below');
    await click(summary().querySelector('a.cite') as Element);
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain('INC-2291');
  });

  it('sends only the asset ID', async () => {
    reply(GEMINI);
    await go('#/asset/M-204');
    await act(settle);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe('/api/summary');
    expect(JSON.parse(init?.body as string)).toEqual({ assetId: 'M-204' });
  });

  it('shows the labeled prepared summary when the call fails', async () => {
    await go('#/asset/M-204');
    await act(settle);
    expect(label()).toBe('Prepared summary, AI unavailable');
    const expected = preparedSummary(retrieve('M-204', alertFor('M-204'), dataset));
    expect(summary().querySelectorAll('li')).toHaveLength(expected.length);
    expect(summary().textContent).toContain(expected[0].text);
  });

  it('labels a server-side fallback the same way', async () => {
    reply({ source: 'prepared', sentences: [{ text: 'Neither is confirmed.', citations: ['INC-2291'] }], reason: 'timeout' });
    await go('#/asset/M-204');
    await act(settle);
    expect(label()).toBe('Prepared summary, AI unavailable');
    expect(summary().textContent).not.toContain('timeout');
  });

  it('falls back on a server error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 })));
    await go('#/asset/F-118');
    await act(settle);
    expect(label()).toBe('Prepared summary, AI unavailable');
  });

  it('never blocks the flow while loading', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => undefined)));
    await go('#/asset/M-204');
    expect(summary().getAttribute('aria-busy')).toBe('true');
    expect(primary().textContent).toBe('Start inspection plan');
    await click(primary());
    expect(selectedTab()).toBe('Inspection plan');
  });

  it('appears only on Investigate, and asks once per machine', async () => {
    reply(GEMINI);
    await go('#/asset/M-204');
    await act(settle);
    await go('#/asset/M-204/plan');
    expect(summary()).toBeNull();
    await go('#/asset/M-204');
    await act(settle);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each(['G-204', 'C-204'])('has no summary on %s and makes no request', async (id) => {
    await go(`#/asset/${id}`);
    await act(settle);
    expect(summary()).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('offers no chat or follow-up input on Investigate', async () => {
    reply(GEMINI);
    await go('#/asset/M-204');
    await act(settle);
    expect(container.querySelector('input, textarea')).toBeNull();
    expect(body()).not.toMatch(/ask|follow-up|chat/i);
  });

  it('shows the same evidence groups with AI on and off', async () => {
    await go('#/asset/M-204');
    await act(settle);
    const off = groupTitles();
    await go('#/');
    resetSummaryRequests();
    reply(GEMINI);
    await go('#/asset/M-204');
    await act(settle);
    expect(label()).toBe('Generated by Gemini from the records below');
    expect(groupTitles()).toEqual(off);
  });
});

describe('M-204 investigate', () => {
  beforeEach(() => go('#/asset/M-204'));

  it('leads with what is wrong and where', () => {
    expect(heading()).toBe('M-204 abnormal vibration');
    expect(container.querySelector('.location')?.textContent).toBe('Line 2, conveyor C-204');
    expect(selectedTab()).toBe('Investigate');
  });

  it('starts the pills at Investigating', () => {
    expect(pills()).toEqual(['Alert raised', 'Investigating', 'Inspected', 'Repair', 'Closed']);
    expect(currentPill()).toBe('Investigating');
  });

  it('derives the safety callout from the SOP first step', () => {
    expect(container.querySelector('.safety')?.textContent?.trim()).toBe('Lock out the motor before you inspect it.');
  });

  it('shows three readings with computed status against labeled limits', () => {
    const readings = [...container.querySelectorAll('.reading')];
    expect(readings).toHaveLength(3);
    expect(readings[0].textContent).toContain('Above, demo limit 4.5');
    expect(readings[2].textContent).toContain('Within, demo limit 14');
    expect(container.querySelectorAll('.sparkline')).toHaveLength(3);
  });

  it('shows two unranked possible causes that link to the procedure', () => {
    expect(body()).toContain('Two possible causes');
    expect(body()).toContain('Neither is confirmed. Steps 2 and 3 of the inspection tell them apart.');
    const causes = [...container.querySelectorAll('.cause')];
    expect(causes).toHaveLength(2);
    expect(causes[0].querySelector('.step-link')?.getAttribute('href')).toBe('#/asset/M-204/plan/step/SOP-014-C-2');
    expect(causes[0].querySelector('.source-link')?.getAttribute('href')).toBe('#/asset/M-204/investigate/source/INC-2291');
    expect(body()).not.toMatch(/\d+\s?%/);
  });

  it('computes the record count from the data', () => {
    expect(container.querySelector('.records h2')?.textContent).toBe(`${dataset.records.length} records checked`);
  });

  it('collapses the evidence rows, with counts that match retrieval', () => {
    const result = retrieve('M-204', alertFor('M-204'), dataset);
    expect(groupTitles()).toEqual([
      `Used as evidence (${result.included.length})`,
      `Not sure it applies (${result.uncertain.length})`,
      `Left out (${result.excluded.length})`,
    ]);
    expect(container.querySelectorAll('.records details[open]')).toHaveLength(0);
  });

  it('keeps labels, and shows the INC-2310 keyword match next to its exclusion reason', () => {
    const row = container.querySelector('a.row[href$="INC-2310"]') as HTMLElement;
    expect(row.classList.contains('row-excluded')).toBe(true);
    expect(row.querySelector('mark')?.textContent).toBe('vibration');
    expect(row.textContent).toContain('A keyword alone does not make this evidence.');
    expect(row.querySelector('.tag')?.textContent).toBeTruthy();
    const direct = container.querySelector('a.row[href$="INC-2291"] .tag');
    expect(direct?.textContent).toBe('Direct asset history');
    const assembly = container.querySelector('a.row[href$="ASM-0412"] .tag');
    expect(assembly?.textContent).toBe('Assembly-level context');
  });

  it('opens a source as a slide-over with every field, and closes it', async () => {
    await click(container.querySelector('a.source-link[href$="INC-1877"]') as Element);
    const sheet = container.querySelector('[role="dialog"]') as HTMLElement;
    for (const field of ['ID', 'Asset', 'Language', 'Original excerpt', 'English explanation', 'Relevance', 'Limitation']) {
      expect([...sheet.querySelectorAll('dt')].map((dt) => dt.textContent)).toContain(field);
    }
    expect(sheet.textContent).toContain('German');
    expect(document.activeElement).toBe(sheet.querySelector('h2'));
    expect(heading()).toBe('M-204 abnormal vibration');
    await click(sheet.querySelector('.sheet-close') as Element);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('closes a source with Escape', async () => {
    await go('#/asset/M-204/investigate/source/INC-2291');
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await settle();
      await navigationArrived('#/asset/M-204');
    });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('jumps from a cause to its step in the plan tab', async () => {
    await click(container.querySelector('.step-link') as Element);
    expect(selectedTab()).toBe('Inspection plan');
    expect(container.querySelector('.steps li.is-target .step-num')?.textContent).toBe('2');
  });
});

describe('tabs', () => {
  it('uses real ARIA tabs with a labeled panel', async () => {
    await go('#/asset/M-204');
    const tabs = [...container.querySelectorAll('[role="tablist"] [role="tab"]')];
    expect(tabs.map((item) => item.textContent)).toEqual(['Investigate', 'Inspection plan', 'Finding']);
    const panel = container.querySelector('[role="tabpanel"]') as HTMLElement;
    expect(panel.getAttribute('aria-labelledby')).toBe('tab-investigate');
    expect(tab('investigate').getAttribute('aria-controls')).toBe(panel.id);
    expect(tab('investigate').getAttribute('tabindex')).toBe('0');
    expect(tab('plan').getAttribute('tabindex')).toBe('-1');
  });

  it('keeps Finding inactive until the plan is saved', async () => {
    await go('#/asset/M-204');
    expect(tab('finding').getAttribute('aria-disabled')).toBe('true');
    await click(tab('finding'));
    expect(selectedTab()).toBe('Investigate');
    await go('#/asset/M-204/finding');
    expect(selectedTab()).toBe('Inspection plan');
    expect(container.querySelector('button.outcome')).toBeNull();
  });

  it('moves with arrow keys, Home and End, and skips inactive tabs', async () => {
    await go('#/asset/M-204');
    await press(tab('investigate'), 'ArrowRight');
    expect(selectedTab()).toBe('Inspection plan');
    expect(document.activeElement).toBe(tab('plan'));
    await press(tab('plan'), 'ArrowRight');
    expect(selectedTab()).toBe('Investigate');
    await press(tab('investigate'), 'End');
    expect(selectedTab()).toBe('Inspection plan');
    await press(tab('plan'), 'Home');
    expect(selectedTab()).toBe('Investigate');
  });

  it('reaches Finding by keyboard once the plan is saved', async () => {
    await savePlanFor('M-204');
    expect(selectedTab()).toBe('Finding');
    await press(tab('finding'), 'ArrowLeft');
    expect(selectedTab()).toBe('Inspection plan');
  });
});

describe('inspection plan', () => {
  beforeEach(() => go('#/asset/M-204/plan'));

  it('shows the steps of the current SOP only', () => {
    expect(body()).toContain('Inspection steps (5)');
    expect(body()).toContain('Review and save inspection plan');
    expect(container.querySelectorAll('.steps li')).toHaveLength(5);
    expect(body()).toContain('Translated from German');
    expect(container.querySelector('.sop-link')?.getAttribute('href')).toBe('#/asset/M-204/plan/source/SOP-014-C');
    expect(body()).toContain('rev C');
    expect(panelText()).not.toContain('rev B');
  });

  it('shows Good and If not lines, and keeps evidence references collapsed', () => {
    expect(body()).toContain('Good:');
    expect(body()).toContain('If not:');
    expect(container.querySelector('.plan details')?.hasAttribute('open')).toBe(false);
  });

  it('shows the safety callout', () => {
    expect(container.querySelector('.safety')).not.toBeNull();
  });

  it('replaces all plan text with German', async () => {
    const english = container.querySelector('.plan')?.textContent;
    await click(languageButton('Deutsch'));
    const plan = container.querySelector('.plan') as HTMLElement;
    expect(plan.getAttribute('lang')).toBe('de');
    expect(plan.textContent).not.toEqual(english);
    expect(plan.textContent).toContain('Inspektionsschritte (5)');
    expect(plan.textContent).toContain('Gut:');
    expect(plan.textContent).not.toContain('Good:');
    expect(plan.textContent).toContain('Motor freischalten und sichern');
    expect(primary().textContent).toBe('Inspektionsplan speichern');
    expect(container.querySelector('.safety')?.textContent).toContain('bevor Sie ihn prüfen');
  });

  it('survives a language change when saving', async () => {
    await click(languageButton('Deutsch'));
    await click(primary());
    expect(selectedTab()).toBe('Finding');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) as string)['M-204'].sopRecordId).toBe('SOP-014-C');
  });
});

describe('finding', () => {
  beforeEach(() => savePlanFor('M-204'));

  it('asks for an outcome, with the note empty and no safety callout', () => {
    expect(selectedTab()).toBe('Finding');
    expect(primary().textContent).toBe('Save finding');
    expect(primary().getAttribute('aria-disabled')).toBe('true');
    expect(body()).toContain('Pick one to save');
    const note = container.querySelector('textarea') as HTMLTextAreaElement;
    expect(note.value).toBe('');
    expect(note.placeholder).toBe('Add a note');
    expect(container.querySelector('.chip')).toBeNull();
    expect(container.querySelector('.safety')).toBeNull();
  });

  it('does nothing when saved with no outcome', async () => {
    await click(primary());
    expect(selectedTab()).toBe('Finding');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) as string)['M-204'].finding).toBeUndefined();
  });

  it('offers suggestions per outcome without prefilling the note', async () => {
    await click(outcomeButton('Bearing wear'));
    expect(outcomeButton('Bearing wear').getAttribute('aria-pressed')).toBe('true');
    expect(primary().getAttribute('aria-disabled')).toBeNull();
    const note = container.querySelector('textarea') as HTMLTextAreaElement;
    expect(note.value).toBe('');
    const chip = container.querySelector('.chip') as HTMLElement;
    await click(chip);
    expect((container.querySelector('textarea') as HTMLTextAreaElement).value).toBe(chip.textContent);
  });

  it('sends Save finding to the Finding tab when used from another tab', async () => {
    await go('#/asset/M-204');
    expect(primary().textContent).toBe('Save finding');
    await click(primary());
    expect(selectedTab()).toBe('Finding');
  });
});

describe('primary action by state, and after saving', () => {
  it('follows Start, Save plan, Save finding, Back', async () => {
    await go('#/asset/M-204');
    expect(primary().textContent).toBe('Start inspection plan');
    await click(primary());
    expect(selectedTab()).toBe('Inspection plan');
    expect(primary().textContent).toBe('Save inspection plan');
    await click(primary());
    expect(selectedTab()).toBe('Finding');
    expect(primary().textContent).toBe('Save finding');
    await click(outcomeButton('Bearing wear'));
    await click(primary());
    expect(selectedTab()).toBe('Investigate');
    expect(primary().textContent).toBe('Back to plant floor');
    expect(primary().getAttribute('href')).toBe('#/');
  });

  it('stays in the workspace and never claims it is solved', async () => {
    await saveFindingFor('M-204', 'Bearing wear');
    expect(heading()).toBe('Bearing wear found. Repair needed.');
    expect(currentPill()).toBe('Inspected');
    expect(container.querySelectorAll('.reading.is-above')).toHaveLength(2);
    expect(body()).toContain('Readings stay high until repaired.');
    expect(machineButton('M-204').getAttribute('aria-label')).toContain('Inspected');
    expect(container.querySelector('.activity')?.textContent).toContain('M-204 inspected: bearing wear');
    expect(container.querySelector('.history')?.textContent).toContain('Technician finding');
    expect(panelText()).not.toMatch(/\b(solved|resolved|fixed)\b/i);
  });

  it('keeps the plan, evidence references and finding across a refresh', async () => {
    await saveFindingFor('M-204', 'Bearing wear');
    await act(async () => root.unmount());
    await mount();
    expect(heading()).toBe('Bearing wear found. Repair needed.');
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) as string)['M-204'];
    expect(saved.evidenceIds).toContain('INC-2291');
    expect(saved.finding.outcome).toBe('bearing_wear');
    await go('#/asset/M-204/finding');
    expect(body()).toContain('Finding saved');
    expect(container.querySelector('button.outcome')).toBeNull();
  });

  it('does not let a saved finding change retrieval', async () => {
    const before = retrieve('M-204', alertFor('M-204'), dataset);
    await saveFindingFor('M-204', 'Lubrication problem');
    expect(retrieve('M-204', alertFor('M-204'), dataset)).toEqual(before);
    expect(groupTitles()).toContain(`Used as evidence (${before.included.length})`);
  });

  it('never writes a real-time activity event before something is saved', () => {
    expect(container.querySelectorAll('.activity-list li')).toHaveLength(alerts.length);
  });
});

describe('M-310: procedure but no incident history', () => {
  beforeEach(() => go('#/asset/M-310'));

  it('refuses to name a cause and keeps the SOP', () => {
    expect(body()).toContain('Insufficient asset-specific evidence to recommend a likely cause.');
    expect(container.querySelector('.cause')).toBeNull();
    expect(primary().textContent).toBe('Start inspection plan');
  });

  it('builds the plan from SOP-022 with no language switch', async () => {
    await click(tab('plan'));
    expect(container.querySelector('.sop-link')?.textContent).toContain('SOP-022');
    expect(container.querySelector('.switch')).toBeNull();
    expect(container.querySelector('.safety')).not.toBeNull();
  });

  it('offers the generic outcomes', async () => {
    await savePlanFor('M-310');
    expect([...container.querySelectorAll('button.outcome')].map((button) => button.textContent)).toEqual([
      'Fault found',
      'No fault found',
      'Inconclusive',
    ]);
  });
});

describe('F-118: no applicable procedure', () => {
  beforeEach(() => go('#/asset/F-118'));

  it('marks the cause unconfirmed and states the gap', () => {
    expect(container.querySelector('.cause .tag')?.textContent).toBe('Unconfirmed');
    expect(body()).toContain('No approved procedure for F-118.');
    expect(body()).toContain('We will not create inspection steps without one. Send it to site review.');
    expect(container.querySelector('.safety')).toBeNull();
  });

  it('labels the plan tab No procedure and blocks it', async () => {
    expect(tab('plan').textContent).toBe('No procedure');
    expect(tab('plan').getAttribute('aria-disabled')).toBe('true');
    expect(tab('finding').getAttribute('aria-disabled')).toBe('true');
    await click(tab('plan'));
    expect(selectedTab()).toBe('Investigate');
  });

  it('skips blocked tabs with the keyboard', async () => {
    await press(tab('investigate'), 'ArrowRight');
    expect(selectedTab()).toBe('Investigate');
    await press(tab('investigate'), 'End');
    expect(selectedTab()).toBe('Investigate');
  });

  it.each(['#/asset/F-118/plan', '#/asset/F-118/finding', '#/asset/F-118/plan/step/SOP-014-C-1'])(
    'can never reach a plan through %s',
    async (hash) => {
      await go(hash);
      expect(selectedTab()).toBe('Investigate');
      expect(container.querySelector('.steps')).toBeNull();
      expect(container.querySelector('button.outcome')).toBeNull();
      expect(primary().textContent).toBe('Escalate through site process');
    },
  );

  it('can never reach a plan through forged saved data', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        'F-118': { assetId: 'F-118', sopRecordId: 'SOP-014-C', stepIds: ['SOP-014-C-1'], evidenceIds: [], savedAt: '2026-11-09T08:00:00.000Z' },
      }),
    );
    await go('#/asset/F-118/plan');
    expect(selectedTab()).toBe('Investigate');
    expect(container.querySelector('.steps')).toBeNull();
    expect(primary().textContent).toBe('Escalate through site process');
  });

  it('uses the escalation pills, escalates, and survives a refresh', async () => {
    expect(pills()).toEqual(['Alert raised', 'Investigating', 'Escalated', 'Site review', 'Closed']);
    await click(primary());
    expect(heading()).toBe('Escalated through the site process. Waiting on site review.');
    expect(currentPill()).toBe('Escalated');
    expect(body()).toContain('Sent to site review.');
    expect(primary().textContent).toBe('Back to plant floor');
    expect(machineButton('F-118').getAttribute('aria-label')).toContain('Escalated');
    expect(container.querySelector('.activity')?.textContent).toContain('F-118 escalated');
    expect(JSON.parse(localStorage.getItem(ESCALATIONS_KEY) as string)['F-118']).toBeDefined();
    await act(async () => root.unmount());
    await mount();
    expect(heading()).toBe('Escalated through the site process. Waiting on site review.');
  });
});

describe('machines with no active alert', () => {
  it.each(['G-204', 'C-204'])('shows %s with no tabs, plan or escalation', async (id) => {
    await go(`#/asset/${id}`);
    expect(container.querySelector('.status-line')?.textContent).toBe('No active alert');
    expect(container.querySelector('[role="tablist"]')).toBeNull();
    expect(container.querySelector('.pill')).toBeNull();
    expect(container.querySelector('.steps')).toBeNull();
    expect(primary().textContent).toBe('Back to plant floor');
    expect(body()).not.toContain('Escalate through site process');
    expect(container.querySelector('.records h2')?.textContent).toBe(`${dataset.records.length} records checked`);
  });

  it('shows INC-2310 as Direct asset history on G-204', async () => {
    await go('#/asset/G-204');
    expect(container.querySelector('a.row[href$="INC-2310"] .tag')?.textContent).toBe('Direct asset history');
  });

  it('opens a source on a machine with no alert', async () => {
    await go('#/asset/G-204');
    await click(container.querySelector('a.row[href$="INC-2310"]') as Element);
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain('INC-2310');
  });
});

describe('every machine has a snapshot', () => {
  it.each([
    ['M-204', 'conveyor C-204'],
    ['M-310', 'No past incidents on this machine'],
    ['F-118', 'No approved procedure'],
    ['G-204', 'Gearbox'],
    ['C-204', 'No approved procedure'],
    ['C-204', '1. Latest: Conveyor alignment drifted after belt change'],
  ])('fills the snapshot on %s', async (id, text) => {
    await go(`#/asset/${id}`);
    const snapshot = container.querySelector('.snapshot') as HTMLElement;
    expect([...snapshot.querySelectorAll('dt')].map((dt) => dt.textContent)).toEqual(['Status', 'Past records', 'Procedure', 'Connected']);
    expect(panelText()).toContain(text);
  });

  it('calls a machine with no connections standalone', async () => {
    await go('#/asset/M-310');
    expect(container.querySelector('.snapshot')?.textContent).toContain('Standalone machine');
  });
});

describe('focus, title and switching', () => {
  it('moves focus to the h1 and updates the title when the machine changes', async () => {
    await go('#/asset/M-204');
    expect(document.activeElement).toBe(container.querySelector('h1'));
    expect(document.title).toBe('Investigate, M-204, Maintenance Copilot');
    await go('#/asset/M-310');
    expect(document.activeElement).toBe(container.querySelector('h1'));
    expect(document.title).toBe('Investigate, M-310, Maintenance Copilot');
  });

  it('updates the title but keeps focus on the tab when only the tab changes', async () => {
    await go('#/asset/M-204');
    await press(tab('investigate'), 'ArrowRight');
    expect(document.title).toBe('Inspection plan, M-204, Maintenance Copilot');
    expect(document.activeElement).toBe(tab('plan'));
  });

  it('carries no state between machines', async () => {
    await savePlanFor('M-204');
    await click(outcomeButton('Bearing wear'));
    await go('#/asset/M-310');
    expect(heading()).toBe('M-310 abnormal vibration');
    expect(body()).not.toContain('Two possible causes');
    expect(primary().textContent).toBe('Start inspection plan');
    await go('#/asset/M-204/finding');
    expect(outcomeButton('Bearing wear').getAttribute('aria-pressed')).toBe('false');
  });

  it('shows an unknown machine as home', async () => {
    await go('#/asset/X-999');
    expect(heading()).toBe(`${alerts.length} active alerts`);
  });
});

describe('reset demo', () => {
  const reset = () => container.querySelector('.reset') as HTMLElement | null;

  it('appears only when saved data exists, and clears it', async () => {
    expect(reset()).toBeNull();
    await saveFindingFor('M-204', 'Bearing wear');
    expect(reset()?.textContent).toBe('Reset demo');
    await click(reset() as Element);
    await act(async () => {
      await settle();
      await navigationArrived('#/');
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(reset()).toBeNull();
    expect(heading()).toBe(`${alerts.length} active alerts`);
    expect(container.querySelectorAll('.label-triangle')).toHaveLength(alerts.length);
  });
});

describe('copy rules', () => {
  it.each(['#/', '#/asset/M-204', '#/asset/M-204/plan', '#/asset/M-310', '#/asset/F-118', '#/asset/G-204', '#/asset/C-204'])(
    'has no em dashes on %s',
    async (hash) => {
      await go(hash);
      expect(body()).not.toContain(String.fromCharCode(0x2014));
    },
  );
});
