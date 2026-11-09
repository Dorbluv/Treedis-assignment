# Process log

Record each meaningful AI mistake or direction change. Only record things that actually happened.

## Planning with ChatGPT and Perplexity

- **Date:** _to fill in_
- **Tool:** ChatGPT, Perplexity
- **Prompt or context:** Used for planning. _Details to fill in._
- **What went wrong:** _to fill in_
- **What changed:** _to fill in_
- **Evidence link or screenshot:** _to fill in_

## Plan review before Gate 1 code

- **Date:** 2026-11-09
- **Tool:** Claude Code
- **Prompt or context:** Plan review requested before any Gate 1 code was written.
- **What went wrong:** Claude Code's plan review found gaps in the brief: no sensor record, gate overlap, and line 2 not being ambiguous. A separate Claude review found scoping errors in Claude Code's proposed retrieval rules.
- **What changed:** Corrected before coding. The superseded SOP rule now applies only to the selected asset. Unknown-applicability records are scoped to plausible assets. An incident can create a possible cause only if its conditions overlap the alert. Labels are set by record kind, and a linked sibling record can never create a cause.
- **Evidence link or screenshot:** _to fill in_

## Native build tools blocked on the development machine

- **Date:** 2026-11-09
- **Tool:** Claude Code
- **Prompt or context:** First `npm install` and test run during the Gate 1 build, on Windows 11 with Smart App Control on.
- **What went wrong:** The tests could not start. Node reported "An Application Control policy has blocked this file" for Rollup's unsigned native binary. esbuild's binary is also unsigned.
- **What changed:** Given the options, the user chose WASM builds. `package.json` now uses npm overrides for `@rollup/wasm-node` and `esbuild-wasm`. Smart App Control was left on.
- **Evidence link or screenshot:** _to fill in_

## Passing tests did not prove usability

- **Date:** 2026-11-09
- **Tool:** Claude Code
- **Prompt or context:** Gate 1 flow, tried by hand after the automated click-through passed.
- **What went wrong:** The automated click-through passed, but when the user tried the flow they could not find the plan or finding steps. A browser review found the finding was hidden below the screen after saving. Passing tests did not prove usability.
- **What changed:** The flow was changed to one action per screen.
- **Evidence link or screenshot:** _to fill in_
