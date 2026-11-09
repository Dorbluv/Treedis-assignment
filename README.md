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

## Credits

Third-party code, all installed through npm:

- React and React DOM (MIT)
- Vite and @vitejs/plugin-react (MIT)
- TypeScript (Apache-2.0)
- Vitest (MIT)
- jsdom (MIT), used only to test the screens
- Playwright (Apache-2.0), used only for the end-to-end flow
- @rollup/wasm-node (MIT) and esbuild-wasm (MIT), used through npm overrides in place of the native Rollup and esbuild binaries, which Windows Smart App Control blocks on the development machine

Font:

- Archivo Variable by Omnibus-Type (SIL Open Font License 1.1), through @fontsource-variable/archivo

No templates or third-party data are used. The plant floor, icons, meters and sparklines are hand-written HTML, CSS and SVG, and every equipment record is synthetic and written for this project.
