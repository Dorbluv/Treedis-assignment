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
```

## Credits

Third-party code, all installed through npm:

- React and React DOM (MIT)
- Vite and @vitejs/plugin-react (MIT)
- TypeScript (Apache-2.0)
- Vitest (MIT)
- @rollup/wasm-node (MIT) and esbuild-wasm (MIT), used through npm overrides in place of the native Rollup and esbuild binaries, which Windows Smart App Control blocks on the development machine

No templates or third-party data are used. The plant layout is hand-written SVG, and every equipment record is synthetic and written for this project.
