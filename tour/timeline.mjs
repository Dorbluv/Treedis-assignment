// The one file that drives the tour. All times are seconds on the voiceover clock.
// Screen text must come from the repo or from the brief. record.mjs checks the `verify` entries.

export const WAV_SECONDS = 315.58;
export const LIVE_URL = 'https://maintenance-copilot.dor-bluvshtain.workers.dev/';
export const WIZARD_COMMIT = 'a62f0f3';
export const LATER_WIZARD_COMMIT = '407519a';
export const WARM_ASSETS = ['M-204', 'F-118'];

const machine = (id) => `.iso-machine[aria-label*="${id}"] polygon:first-of-type`;
const queue = (id) => `.queue-item:has-text("${id}")`;

// Black dips hide the page changes between the live site and the local cards.
export const FADES = [
  { type: 'out', at: 153.7, seconds: 0.3 },
  { type: 'in', at: 154.2, seconds: 0.3 },
  { type: 'out', at: 305.0, seconds: 0.4 },
  { type: 'in', at: 305.9, seconds: 0.5 },
  { type: 'out', at: 314.58, seconds: 1.0 },
];

export const CARDS = {
  tools: {
    kicker: 'Tools',
    list: ['ChatGPT', 'Perplexity', 'Claude', 'Claude Code'],
    verify: [
      { file: 'PROCESS_LOG.md', text: '**Tool:** ChatGPT, Perplexity' },
      { file: 'PROCESS_LOG.md', text: 'A separate Claude review' },
      { file: 'PROCESS_LOG.md', text: "Claude Code's plan review" },
    ],
  },
  guess: {
    // Quotes come from the brief. They are not stored in the repo.
    big: '"My honest grade: 7/10"',
    sub: '"You are treating a plausible problem as a proven root cause."',
    source: 'Perplexity review, pasted into my ChatGPT planning conversation. https://chatgpt.com/share/6af19668-413c-83eb-ad97-b7f63e19c4d1',
  },
  retrieval: {
    kicker: 'Retrieval rule correction',
    big: 'The superseded SOP rule now applies only to the selected asset.',
    sub: 'Unknown-applicability records are scoped to plausible assets.',
    source: 'PROCESS_LOG.md, "Plan review before Gate 1 code"',
    verify: [
      { file: 'PROCESS_LOG.md', text: 'The superseded SOP rule now applies only to the selected asset.' },
      { file: 'PROCESS_LOG.md', text: 'Unknown-applicability records are scoped to plausible assets.' },
    ],
  },
  wizard: {
    image: 'out/wizard/after-save.png',
    imageLabel: `Rebuilt from commit ${WIZARD_COMMIT}`,
    big: "All tests passed. I couldn't find the next step.",
    verify: [{ file: 'PROCESS_LOG.md', text: 'The automated click-through passed, but when the user tried the flow they could not find the plan or finding steps.' }],
  },
  laterWizard: {
    image: 'out/wizard/407519a.png',
    imageLabel: `Rebuilt from commit ${LATER_WIZARD_COMMIT}`,
  },
  directions: {
    image: '../evidence/design-directions.png',
    fullscreen: true,
  },
  workspace: {
    image: 'out/workspace.png',
    imageLabel: 'The final workspace',
  },
  models: {
    kicker: 'Real model runs',
    stats: [
      { value: '0 of 9', label: 'First run, gemini-3.8-flash: 7 timeouts, 2 HTTP 503' },
      { value: 'Rejected', label: '"Increased vibration was traced to insufficient bearing lubrication."' },
      { value: '9 of 9', label: 'Final result, prompt v5, gemini-3.5-flash-lite' },
    ],
    source: 'evidence/gate-3/',
  },
  refused: {
    kicker: 'From the process log',
    big: 'Claude Code refused to record the "without asking" wording.',
    sub: 'Claude Code had asked, and the user had replied "do what ever you need to finish with it".',
    source: 'PROCESS_LOG.md, "Declined to record an uninstall claim it could not support"',
    verify: [
      { file: 'PROCESS_LOG.md', text: 'Claude Code refused to record the "without asking" wording.' },
      { file: 'PROCESS_LOG.md', text: 'Claude Code had asked, and the user had replied "do what ever you need to finish with it".' },
    ],
  },
  question: {
    big: 'Does search really drive downtime?',
    sub: 'Ask technicians.',
  },
};

// Checked against the raw run files before anything is recorded.
export const MODEL_FACTS = {
  firstRun: { file: 'evidence/gate-3/model-runs-first.json', valid: 0, total: 9, errors: { timeout: 7, http_503: 2 }, model: 'gemini-3.8-flash' },
  finalRun: { file: 'evidence/gate-3/model-runs-prompt-v5.json', valid: 9, total: 9, model: 'gemini-3.5-flash-lite', prompt: 'v5' },
  rejected: { file: 'evidence/gate-3/model-diagnostic-1.json', text: 'Increased vibration was traced to insufficient bearing lubrication.', rule: 'diagnosis' },
};

export const SECTIONS = [
  {
    name: 'home', start: 0, frameAt: 16,
    steps: [
      { at: 5, hover: queue('M-204'), ms: 1800 },
      { at: 12, hover: queue('M-310'), ms: 1200 },
      { at: 18, hover: queue('F-118'), ms: 1200 },
      { at: 24, hover: machine('M-204'), ms: 2200 },
    ],
  },
  {
    name: 'select-m204', start: 28.7, frameAt: 43,
    steps: [
      { at: 29.0, click: machine('M-204'), ms: 700 },
      { at: 35, hover: machine('C-204'), ms: 1600 },
      { at: 41, hover: machine('G-204'), ms: 1600 },
    ],
  },
  {
    name: 'investigate-left-out', start: 49.5, frameAt: 65,
    steps: [
      { at: 49.6, hover: '.tab:has-text("Investigate")', ms: 800 },
      { at: 50.5, scroll: '.groups .group:last-of-type', ms: 1100 },
      { at: 52, click: '.groups .group:last-of-type summary', ms: 700 },
      { at: 54, scroll: 'a.row[href$="INC-2310"]', ms: 900 },
      { at: 55.2, hover: 'a.row[href$="INC-2310"] mark', ms: 900 },
    ],
  },
  {
    name: 'causes-and-summary', start: 73.4, frameAt: 81.5,
    steps: [
      { at: 73.6, scroll: 'section[aria-label="Possible causes"]', ms: 1100, block: 'start' },
      { at: 75, hover: '.compare .cause:first-child h3', ms: 900 },
      { at: 79.2, hover: '.compare .cause:nth-child(2) h3', ms: 900 },
    ],
  },
  {
    name: 'plan-lockout-deutsch', start: 83.5, frameAt: 95,
    steps: [
      { at: 83.7, click: '[data-primary]', ms: 800 },
      { at: 86.5, hover: '.safety', ms: 900 },
      { at: 92.3, click: '.switch button:has-text("Deutsch")', ms: 700 },
      { at: 98, click: '.switch button:has-text("English")', ms: 700 },
    ],
  },
  {
    name: 'save-and-finding', start: 100.9, frameAt: 116.5,
    steps: [
      { at: 101.0, click: '[data-primary]', ms: 800 },
      { at: 104, click: 'button.outcome:has-text("Bearing wear")', ms: 800 },
      { at: 106.8, click: '[data-primary]', ms: 800 },
      { at: 109.2, hover: '.pills', ms: 800 },
      { at: 112, hover: '.readings', ms: 800 },
      { at: 115, hover: '.label-inspected', ms: 900 },
    ],
  },
  {
    name: 'm310-insufficient', start: 118.5, frameAt: 124,
    steps: [
      { at: 118.7, click: machine('M-310'), ms: 800 },
      { at: 120.5, scroll: '.insufficient', ms: 800 },
      { at: 121.5, hover: '.insufficient', ms: 800 },
    ],
  },
  {
    name: 'f118-no-procedure', start: 126, frameAt: 133,
    steps: [
      { at: 126.0, click: machine('F-118'), ms: 800 },
      { at: 128, scroll: '.gap', ms: 800 },
      { at: 129, hover: '.gap', ms: 800 },
    ],
  },
  {
    name: 'return-to-floor', start: 136.6, frameAt: 148,
    steps: [
      { at: 136.8, click: 'a.wordmark', ms: 900 },
      { at: 140, hover: machine('M-204'), ms: 2200 },
    ],
  },
  { name: 'card-tools', start: 154.3, frameAt: 162, steps: [{ at: 153.95, goto: 'cards' }, { at: 154.0, card: 'tools' }] },
  { name: 'card-guess', start: 170.6, frameAt: 180, steps: [{ at: 170.6, card: 'guess' }] },
  { name: 'card-retrieval', start: 189.6, frameAt: 196, steps: [{ at: 189.6, card: 'retrieval' }] },
  { name: 'card-wizard', start: 203.0, frameAt: 216, steps: [{ at: 203.0, card: 'wizard' }] },
  { name: 'card-later-wizard', start: 229.0, frameAt: 232.5, steps: [{ at: 229.0, card: 'laterWizard' }] },
  { name: 'card-directions', start: 235.0, frameAt: 239, steps: [{ at: 235.0, card: 'directions' }] },
  { name: 'card-workspace', start: 243.0, frameAt: 246, steps: [{ at: 243.0, card: 'workspace' }] },
  { name: 'card-models', start: 248.7, frameAt: 263, steps: [{ at: 248.7, card: 'models' }] },
  { name: 'card-refused', start: 277.3, frameAt: 285, steps: [{ at: 277.3, card: 'refused' }] },
  { name: 'card-question', start: 292.8, frameAt: 299, steps: [{ at: 292.8, card: 'question' }] },
  { name: 'live-end', start: 305.9, frameAt: 311, steps: [{ at: 305.4, goto: 'live' }] },
];
