# Maintenance Copilot

A working prototype for the Treedis AI PM take-home. It goes from a machine alert to an evidence-backed inspection plan. All data is synthetic and it is not for operational use.

## Run

```
npm install
npm run dev
```

## Test

```
npm test
npm run test:e2e
```

`npm run test:e2e` runs the M-204 flow at three viewport sizes in the installed Chrome and saves a screenshot per step to `evidence/`.

## Evidence summary (Gate 3)

On the Investigate tab, Gemini rewrites records that retrieval already chose into up to three short sentences. It never decides what counts as evidence and never creates a procedure.

- The browser sends only an asset ID to `POST /api/summary`. The Worker runs `retrieve()` on bundled data and sends only that asset's included records to the model. Inspection steps are withheld.
- Model: `gemini-3.8-flash`, confirmed on Google's models and pricing pages on 2026-11-09. Timeout: 8 seconds.
- Each asset's result is cached on the server, 24 hours when valid and 5 minutes after a failure. Assumed: the cache is the isolate's memory plus the Cloudflare Cache API, which is per data center, so a few extra calls are possible.
- If the call fails, times out or fails validation, the app shows a deterministic summary labeled "Prepared summary, AI unavailable". The flow never waits for AI.

### Setting the key

The key is the secret `GEMINI_API_KEY`. It must never be committed or shared in chat.

- Local: create `.dev.vars` in the project root with one line, `GEMINI_API_KEY=your-key`. The file is ignored by git.
- Deployed: Cloudflare dashboard, Workers & Pages, maintenance-copilot, Settings, Variables and Secrets, Add, type Secret, name `GEMINI_API_KEY`.

Without a key the app uses the prepared summary.

### What validation does not prove

Before anything is shown, code checks that every cited ID is in that asset's included set, that every number appears in a cited record, that no sentence states a confirmed cause, names a cause outside the allowed list or gives an instruction, and that M-310 states evidence is insufficient and names no cause.

These checks do not fully prove that each excerpt supports its sentence. They are word and number patterns. A number can be attached to the wrong reading, and a claim can use allowed words yet misread its source. That is why a person reviews the sentences below.

### Human review

Not filled yet: this table is built from the real model runs. The verdict column is for the human reviewer.

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
