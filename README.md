# Maintenance Copilot

A working prototype for the Treedis AI PM take-home. It goes from a machine alert to an evidence-backed inspection plan. All data is synthetic and it is not for operational use.

Live demo: https://maintenance-copilot.dor-bluvshtain.workers.dev/

## Run

```
npm install && npm run dev
```

In Windows PowerShell 5.1, use `;` in place of `&&`. No key is needed: without one the app shows its prepared summary.

## Test

```
npm test
npm run test:e2e
```

`npm run test:e2e` runs the M-204 flow at three viewport sizes in the installed Chrome and saves a screenshot per step to `evidence/`.

## Evidence summary (Gate 3)

On the Investigate tab, Gemini reads the records that retrieval already chose and returns at most two short sentences: what those records have in common or where they differ, and what they cannot tell the technician about the current fault. It does not repeat the readings, dates, fixes or downtime already on screen. It never decides what counts as evidence and never creates a procedure.

- The browser sends only an asset ID to `POST /api/summary`. The Worker runs `retrieve()` on bundled data and sends only that asset's included records to the model. Inspection steps are withheld.
- Model: `gemini-3.5-flash-lite`, on the free tier per Google's pricing page and listed there for new projects, checked 2026-11-09. Timeout: 8 seconds. In testing on that date, `gemini-3.8-flash` and `gemini-3.6-flash` mostly returned 503 or timed out.
- Each asset's result is cached on the server, 24 hours when valid and 5 minutes after a failure. Assumed: the cache is the isolate's memory plus the Cloudflare Cache API, which is per data center, so a few extra calls are possible.
- If the call fails, times out or fails validation, the app shows a deterministic summary labeled "Prepared summary, AI unavailable". The flow never waits for AI.

### Setting the key

The key is the secret `GEMINI_API_KEY`. It must never be committed or shared in chat.

- Local: create `.dev.vars` in the project root with one line, `GEMINI_API_KEY=your-key`. The file is ignored by git.
- Deployed: Cloudflare dashboard, Workers & Pages, maintenance-copilot, Settings, Variables and Secrets, Add, type Secret, name `GEMINI_API_KEY`.

Without a key the app uses the prepared summary.

### What validation does not prove

Before anything is shown, code checks that every cited ID is in that asset's included set, that every number appears in a cited record, that no sentence states a confirmed cause, names a cause outside the allowed list or gives an instruction, that every limit is called a demo limit, that no sentence only restates a reading, that a summary names all allowed causes or none, and that M-310 states evidence is insufficient and names no cause.

These checks do not fully prove that each excerpt supports its sentence. They are word and number patterns. A number can be attached to the wrong reading, and a claim can use allowed words yet misread its source. That is why a person reviews the sentences below.

### Human review

Built from the real model runs in `evidence/gate-3/model-runs-prompt-v5.json`, one row per distinct sentence across the 9 valid runs of 9. The verdict column is for the human reviewer.

**M-204**

| Sentence | Cited excerpt | Supported (yes or no) |
|---|---|---|
| Bearing wear and lubrication problem are possible causes in these records. | INC-2291: High vibration reported on M-204. The shaft ran rough when turned by hand and the drive-end bearing had play. On opening the housing, the outer race showed wear. Bearing replaced. INC-1877: Erhöhte Vibration an M-204 festgestellt. Schmierstoffstand am Lager unter der Markierung, Ursache war unzureichende Schmierung. Schmierstoff nachgefüllt, Vibration danach im Normalbereich. |  |
| These records cannot tell whether either applies to the current fault. | INC-2291: High vibration reported on M-204. The shaft ran rough when turned by hand and the drive-end bearing had play. On opening the housing, the outer race showed wear. Bearing replaced. INC-1877: Erhöhte Vibration an M-204 festgestellt. Schmierstoffstand am Lager unter der Markierung, Ursache war unzureichende Schmierung. Schmierstoff nachgefüllt, Vibration danach im Normalbereich. |  |
| Bearing wear and a lubrication problem are possible causes in these records. | INC-2291: High vibration reported on M-204. The shaft ran rough when turned by hand and the drive-end bearing had play. On opening the housing, the outer race showed wear. Bearing replaced. INC-1877: Erhöhte Vibration an M-204 festgestellt. Schmierstoffstand am Lager unter der Markierung, Ursache war unzureichende Schmierung. Schmierstoff nachgefüllt, Vibration danach im Normalbereich. |  |
| These records cannot tell what is happening now. | INC-2291: High vibration reported on M-204. The shaft ran rough when turned by hand and the drive-end bearing had play. On opening the housing, the outer race showed wear. Bearing replaced. INC-1877: Erhöhte Vibration an M-204 festgestellt. Schmierstoffstand am Lager unter der Markierung, Ursache war unzureichende Schmierung. Schmierstoff nachgefüllt, Vibration danach im Normalbereich. |  |

**M-310**

| Sentence | Cited excerpt | Supported (yes or no) |
|---|---|---|
| Insufficient asset-specific evidence to recommend a likely cause. | SOP-022: Isolate and lock out M-310 using the site-approved procedure before inspection. Check bearing housing and mounting bolts. SR-M310-01: Motor housing: vibration velocity 6.2 mm/s RMS (demo limit 4.5). |  |
| These records lack historical failure details and previous event logs for this machine. | SR-M310-01: Motor housing: vibration velocity 6.2 mm/s RMS (demo limit 4.5). |  |
| These records lack historical maintenance events and past failure details for this machine. | SOP-022: Isolate and lock out M-310 using the site-approved procedure before inspection. Check bearing housing and mounting bolts. SR-M310-01: Motor housing: vibration velocity 6.2 mm/s RMS (demo limit 4.5). |  |
| The records lack historical fault logs for this specific machine. | SOP-022: Isolate and lock out M-310 using the site-approved procedure before inspection. Check bearing housing and mounting bolts. SR-M310-01: Motor housing: vibration velocity 6.2 mm/s RMS (demo limit 4.5). |  |

**F-118**

| Sentence | Cited excerpt | Supported (yes or no) |
|---|---|---|
| Nozzle blockage is a possible cause. | INC-1650: Filler F-118 stopped on low flow. Nozzle 3 was blocked and was cleared. |  |
| These records cannot confirm if this incident applies to the current fault. | INC-1650: Filler F-118 stopped on low flow. Nozzle 3 was blocked and was cleared. |  |
| These records cannot tell the technician why the current pressure is high. | INC-1650: Filler F-118 stopped on low flow. Nozzle 3 was blocked and was cleared. SR-F118-01: Nozzle bank: pressure 3.8 bar (demo limit 3.0). |  |
| These records cannot tell the technician why the current fault occurred. | INC-1650: Filler F-118 stopped on low flow. Nozzle 3 was blocked and was cleared. |  |

## Credits

Third-party code, all installed through npm:

- React and React DOM (MIT)
- Vite and @vitejs/plugin-react (MIT)
- TypeScript (Apache-2.0)
- Vitest (MIT)
- jsdom (MIT), used only to test the screens
- Playwright (Apache-2.0), used only for the end-to-end flow
- DefinitelyTyped type packages, including @types/node (MIT), used only at build time
- @rollup/wasm-node (MIT) and esbuild-wasm (MIT), used through npm overrides in place of the native Rollup and esbuild binaries, which Windows Smart App Control blocks on the development machine

Font:

- Sora Variable by The Sora Project Authors (SIL Open Font License 1.1), through @fontsource-variable/sora
- Instrument Sans Variable by The Instrument Sans Project Authors (SIL Open Font License 1.1), through @fontsource-variable/instrument-sans

No templates or third-party data are used. The plant floor, icons, readings and sparklines are hand-written HTML, CSS and SVG, and every equipment record is synthetic and written for this project.
