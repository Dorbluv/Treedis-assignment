// Records the tour from tour/timeline.mjs. Run from the repo root: node tour/record.mjs
// TOUR_SPEED=8 runs a fast rehearsal with no recording, to check every step.
import { chromium } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import * as T from './timeline.mjs';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'tour/out');
const FFMPEG = process.env.FFMPEG || path.join(OUT, 'bin/ffmpeg.exe');
const SPEED = Number(process.env.TOUR_SPEED || 1);
const REHEARSAL = SPEED !== 1;
const FINAL = path.join(OUT, 'maintenance-copilot-tour.mp4');
const VIEW = { width: 1920, height: 1080 };

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.json': 'application/json' };
function serve(root, port) {
  const server = http.createServer((req, res) => {
    const file = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    const target = fs.existsSync(file) && fs.statSync(file).isDirectory() ? path.join(file, 'index.html') : file;
    if (!target.startsWith(root) || !fs.existsSync(target)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(target)] || 'application/octet-stream' });
    fs.createReadStream(target).pipe(res);
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

function verifySources() {
  for (const [name, card] of Object.entries(T.CARDS)) {
    for (const { file, text } of card.verify ?? []) {
      if (!fs.readFileSync(file, 'utf8').includes(text)) throw new Error(`Card ${name}: not found in ${file}: ${text}`);
    }
  }
  const { firstRun, finalRun, rejected } = T.MODEL_FACTS;
  const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
  const first = read(firstRun.file);
  const errors = {};
  first.runs.forEach((run) => { errors[run.error] = (errors[run.error] || 0) + 1; });
  if (first.model !== firstRun.model || first.runs.length !== firstRun.total || first.runs.filter((r) => r.valid).length !== firstRun.valid || JSON.stringify(errors) !== JSON.stringify(firstRun.errors)) throw new Error('First run facts do not match');
  const final = read(finalRun.file);
  if (final.model !== finalRun.model || final.promptVersion !== finalRun.prompt || final.runs.length !== finalRun.total || final.runs.filter((r) => r.valid).length !== finalRun.valid) throw new Error('Final run facts do not match');
  const hit = read(rejected.file).find((run) => run.raw?.includes(rejected.text) && run.failures?.some((f) => f.rule === rejected.rule));
  if (!hit) throw new Error('Rejected sentence not found in the diagnostic');
  console.log('Card sources verified');
}

async function warmSummaries() {
  for (const id of T.WARM_ASSETS) {
    const response = await fetch(`${T.LIVE_URL}api/summary`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ assetId: id }) });
    const body = await response.json();
    console.log(`Warmed ${id}: ${body.source}`);
    if (body.source !== 'gemini') throw new Error(`${id} did not return Gemini text`);
  }
}

async function captureStills(browser) {
  fs.mkdirSync(path.join(OUT, 'wizard'), { recursive: true });
  const server = await serve(path.join(OUT, 'wizard-src/dist'), 5196);
  // A common laptop size, where the old flow pushed the finding below the screen.
  const old = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await old.goto('http://localhost:5196/#/asset/M-204/plan');
  await old.getByRole('button', { name: 'Save inspection plan' }).click();
  await old.waitForTimeout(400);
  await old.screenshot({ path: path.join(OUT, 'wizard/after-save.png') });
  await old.close();
  server.close();

  const laterServer = await serve(path.join(OUT, 'wizard-407-src/dist'), 5198);
  const later = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await later.goto('http://localhost:5198/#/asset/M-204/evidence');
  await later.waitForSelector('h1');
  await later.waitForTimeout(400);
  await later.screenshot({ path: path.join(OUT, `wizard/${T.LATER_WIZARD_COMMIT}.png`) });
  await later.close();
  laterServer.close();

  const live = await browser.newPage({ viewport: VIEW });
  await live.goto(`${T.LIVE_URL}#/asset/M-204`);
  await live.waitForSelector('.summary-label');
  await live.waitForTimeout(500);
  await live.screenshot({ path: path.join(OUT, 'workspace.png') });
  await live.close();
}

/** Runs inside the page: the cursor, the click ring and the smooth scroll. Recording only. */
function installTourTools() {
  const setup = () => {
    if (window.__tour) return;
    const style = document.createElement('style');
    style.textContent = `
      #tour-cursor { position: fixed; left: 0; top: 0; width: 30px; height: 30px; z-index: 2147483647; pointer-events: none; filter: drop-shadow(0 2px 3px rgba(0,0,0,.55)); }
      .tour-ring { position: fixed; width: 56px; height: 56px; margin: -28px 0 0 -28px; border-radius: 50%; border: 3px solid #7fe0d3; background: rgba(127,224,211,.22); z-index: 2147483646; pointer-events: none; animation: tour-ring 650ms ease-out forwards; }
      @keyframes tour-ring { from { transform: scale(.35); opacity: .95; } to { transform: scale(1.25); opacity: 0; } }
      #tour-black { position: fixed; inset: 0; background: #000; z-index: 2147483647; }`;
    document.documentElement.append(style);
    const cursor = document.createElement('div');
    cursor.id = 'tour-cursor';
    cursor.innerHTML = '<svg viewBox="0 0 24 24" width="30" height="30"><path d="M4 2l16 11.5-7 1.2L9.6 22z" fill="#fff" stroke="#0b1520" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    document.documentElement.append(cursor);
    const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2);
    const animate = (ms, frame) => new Promise((resolve) => {
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / ms, 1);
        frame(ease(p));
        if (p < 1) requestAnimationFrame(tick); else resolve();
      };
      requestAnimationFrame(tick);
    });
    window.__tour = {
      x: 960, y: 620,
      place() { cursor.style.transform = `translate(${this.x}px, ${this.y}px)`; },
      moveTo(x, y, ms) {
        const fromX = this.x; const fromY = this.y;
        return animate(ms, (p) => { this.x = fromX + (x - fromX) * p; this.y = fromY + (y - fromY) * p; this.place(); });
      },
      ring(x, y) {
        const ring = document.createElement('div');
        ring.className = 'tour-ring'; ring.style.left = `${x}px`; ring.style.top = `${y}px`;
        document.documentElement.append(ring);
        setTimeout(() => ring.remove(), 700);
      },
      scrollPanelTo(selector, ms, block) {
        const panel = document.querySelector('.panel-scroll');
        const element = document.querySelector(selector);
        if (!panel || !element) throw new Error(`scroll target missing: ${selector}`);
        const a = panel.getBoundingClientRect(); const b = element.getBoundingClientRect();
        const offset = b.top - a.top + panel.scrollTop;
        const wanted = block === 'start' ? offset - 12 : offset - (a.height - b.height) / 2;
        const to = Math.max(0, Math.min(wanted, panel.scrollHeight - panel.clientHeight));
        const from = panel.scrollTop;
        return animate(ms, (p) => { panel.scrollTop = from + (to - from) * p; });
      },
      showCursor(show) { cursor.style.display = show ? '' : 'none'; },
      black(on) {
        document.getElementById('tour-black')?.remove();
        if (on) { const cover = document.createElement('div'); cover.id = 'tour-black'; document.documentElement.append(cover); }
      },
    };
    window.__tour.place();
  };
  if (document.documentElement) setup(); else document.addEventListener('readystatechange', setup, { once: true });
}

async function runStep(page, step, cardsUrl) {
  const time = (ms) => Math.max(1, Math.round((ms ?? 800) / SPEED));
  const tools = (call, ...args) => page.evaluate(([name, list]) => window.__tour[name](...list), [call, args]);

  async function pointAt(selector) {
    const box = await page.locator(selector).first().boundingBox();
    if (!box) throw new Error(`Nothing visible for ${selector}`);
    const x = box.x + box.width / 2; const y = box.y + box.height / 2;
    if (y < 0 || y > VIEW.height || x < 0 || x > VIEW.width) throw new Error(`Off screen: ${selector}`);
    await tools('moveTo', x, y, time(step.ms));
    await page.mouse.move(x, y);
    return { x, y };
  }

  if (step.hover) await pointAt(step.hover);
  else if (step.click) {
    const { x, y } = await pointAt(step.click);
    await page.waitForTimeout(time(250));
    await tools('ring', x, y);
    await page.mouse.click(x, y);
  } else if (step.scroll) await tools('scrollPanelTo', step.scroll, time(step.ms), step.block ?? 'center');
  else if (step.goto === 'cards') {
    await page.goto(cardsUrl, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await tools('showCursor', false);
  } else if (step.goto === 'live') {
    await page.goto(T.LIVE_URL, { waitUntil: 'load' });
    await page.waitForSelector('h1');
    await tools('showCursor', false);
  } else if (step.card) await page.evaluate((card) => window.showCard(card), T.CARDS[step.card]);
}

function ffmpeg(args) {
  const result = spawnSync(FFMPEG, ['-hide_banner', ...args], { encoding: 'utf8', maxBuffer: 1 << 28 });
  return { code: result.status, log: result.stdout + result.stderr };
}

function durationOf(file) {
  const match = /Duration: (\d+):(\d+):([\d.]+)/.exec(ffmpeg(['-i', file]).log);
  return match ? Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) : NaN;
}

function combine(rawVideo, report) {
  const scan = ffmpeg(['-t', '30', '-i', rawVideo, '-vf', 'blackdetect=d=0.8:pix_th=0.06', '-an', '-f', 'null', '-']).log;
  const ends = [...scan.matchAll(/black_end:([\d.]+)/g)].map((m) => Number(m[1]));
  if (ends.length === 0) throw new Error('Could not find the start marker in the raw video');
  const startOffset = ends[0];
  report.startOffsetInRawVideo = startOffset;
  report.rawVideoSeconds = durationOf(rawVideo);
  report.rawSecondsAfterStart = report.rawVideoSeconds - startOffset;

  // A fade-in blacks out everything before it, so each fade may only see its own segment.
  const cuts = [];
  T.FADES.forEach((fade, index) => {
    const next = T.FADES[index + 1];
    if (fade.type === 'out' && next?.type === 'in') cuts.push((fade.at + fade.seconds + next.at) / 2);
  });
  const edges = [0, ...cuts, T.WAV_SECONDS + 2];
  const segments = edges.slice(0, -1).map((start, index) => {
    const end = edges[index + 1];
    const fades = T.FADES.filter((f) => f.at >= start && f.at < end).map((f) => `,fade=t=${f.type}:st=${f.at}:d=${f.seconds}`).join('');
    return `[p${index}]trim=start=${start}:end=${end}${fades},setpts=PTS-STARTPTS[s${index}]`;
  });
  const names = segments.map((_, index) => `[p${index}]`).join('');
  const joined = segments.map((_, index) => `[s${index}]`).join('');
  const graph = `[0:v]fps=30,scale=1920:1080,tpad=stop_mode=clone:stop_duration=3,split=${segments.length}${names};${segments.join(';')};${joined}concat=n=${segments.length}:v=1:a=0[video]`;

  const wav = path.join(ROOT, 'tour/voiceover.wav');
  const { code, log } = ffmpeg([
    '-y', '-ss', String(startOffset), '-i', rawVideo, '-i', wav,
    '-filter_complex', graph,
    '-map', '[video]', '-map', '1:a:0',
    '-t', String(T.WAV_SECONDS),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', FINAL,
  ]);
  if (code !== 0) throw new Error(`ffmpeg failed:\n${log.slice(-1500)}`);

  const framesDir = path.join(OUT, 'frames');
  fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });
  T.SECTIONS.forEach((section, index) => {
    const name = `${String(index + 1).padStart(2, '0')}-${section.name}.png`;
    ffmpeg(['-y', '-ss', String(section.frameAt), '-i', FINAL, '-frames:v', '1', path.join(framesDir, name)]);
  });
  report.mp4Seconds = durationOf(FINAL);
  report.wavSeconds = durationOf(wav);
  report.differenceSeconds = Math.abs(report.mp4Seconds - report.wavSeconds);
}

function recombineOnly() {
  const dir = path.join(OUT, 'raw');
  const raw = fs.readdirSync(dir).filter((name) => name.endsWith('.webm')).map((name) => path.join(dir, name)).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
  const report = { recombined: true };
  combine(raw, report);
  fs.writeFileSync(path.join(OUT, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

async function main() {
  if (process.env.TOUR_RECOMBINE) { recombineOnly(); return; }
  verifySources();
  await warmSummaries();
  const browser = await chromium.launch({ channel: 'chrome' });
  await captureStills(browser);
  const cardsServer = await serve(ROOT, 5197);
  const cardsUrl = 'http://localhost:5197/tour/cards.html';

  const context = await browser.newContext({
    viewport: VIEW,
    ...(REHEARSAL ? {} : { recordVideo: { dir: path.join(OUT, 'raw'), size: VIEW } }),
  });
  await context.addInitScript(installTourTools);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(T.LIVE_URL, { waitUntil: 'load' });
  await page.waitForSelector('.iso-machine');
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.__tour.black(true));
  await page.waitForTimeout(REHEARSAL ? 100 : 3000);

  await page.evaluate(() => window.__tour.black(false));
  const zero = performance.now();
  const clock = () => ((performance.now() - zero) / 1000) * SPEED;
  const late = [];
  const steps = T.SECTIONS.flatMap((section) => section.steps.map((step) => ({ ...step, section: section.name })));

  for (const step of steps) {
    const wait = (step.at - clock()) / SPEED;
    if (wait > 0) await page.waitForTimeout(wait * 1000);
    const started = clock();
    const lateness = started - step.at;
    if (lateness > 0.25) late.push({ section: step.section, at: step.at, lateSeconds: Number(lateness.toFixed(2)) });
    await runStep(page, step, cardsUrl);
    console.log(`${step.at.toFixed(1).padStart(6)}  ${step.section}  ${step.hover || step.click || step.scroll || step.goto || step.card}`);
  }

  const remaining = (T.WAV_SECONDS + 0.8 - clock()) / SPEED;
  if (remaining > 0) await page.waitForTimeout(remaining * 1000);
  const video = page.video();
  await page.close();
  await context.close();
  await browser.close();
  cardsServer.close();

  const report = { speed: SPEED, late, pageErrors: errors };
  if (!REHEARSAL) {
    const raw = await video.path();
    combine(raw, report);
    report.clockSecondsRecorded = T.WAV_SECONDS + 0.8;
  }
  fs.writeFileSync(path.join(OUT, REHEARSAL ? 'rehearsal.json' : 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
