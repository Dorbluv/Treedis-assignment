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

## Visual design and possible causes rejected

- **Date:** 2026-11-09
- **Tool:** Claude Code
- **Prompt or context:** Gate 1 UX fix, tried by hand before merging.
- **What went wrong:** The automated click-through passed, but the user could not find the plan or finding steps, and rejected the visual design and the possible-causes content as not useful.
- **Caught by:** The user.
- **What changed:** Redesigned around one action per screen and a comparison that tells the technician how to separate the causes.
- **Evidence link or screenshot:** _to fill in_

## Contrast failure and vibration mismatch found in the design plan

- **Date:** 2026-11-09
- **Tool:** Claude Code
- **Prompt or context:** Design plan for the Gate 1 redesign.
- **What went wrong:** The proposed line color failed AA contrast for controls when measured. The existing reading of 7.1 mm/s did not match the requested 8.4 mm/s.
- **Caught by:** Claude Code.
- **What changed:** Added a separate control line color. Vibration is 8.4 mm/s everywhere.
- **Evidence link or screenshot:** _to fill in_

## Alignment contradiction found in plan review

- **Date:** 2026-11-09
- **Tool:** Claude chat
- **Prompt or context:** Plan review of the Gate 1 redesign.
- **What went wrong:** The plan had an alignment contradiction: SOP step 4 checks alignment, but alignment is not listed as a possible cause.
- **Caught by:** Claude chat.
- **What changed:** A line under the comparison explains why step 4 checks alignment and links to the SOP step and ASM-0412. The ASM-0412 takeaway now states what happened on the conveyor without suggesting a cause on this motor.
- **Evidence link or screenshot:** _to fill in_

## Redesign rejected for density, steps, translation and plant floor

- **Date:** 2026-11-09
- **Tool:** Claude Code
- **Prompt or context:** Review of the dark redesign on `gate-1`.
- **What went wrong:** The user reviewed the redesign and rejected the text density, the unclear steps, the translation handling and the plant floor.
- **Caught by:** The user.
- **What changed:** Short phrases and collapsed evidence, numbered plan steps with titles, an English / Deutsch switch, and a rebuilt plant floor. Decision: the rule that color appears only on abnormal things was reversed to make the floor feel alive, with tinted zones and normal status color. Coral stays for alerts only.
- **Evidence link or screenshot:** _to fill in_

## Other machines led back to M-204

- **Date:** 2026-11-09
- **Tool:** Claude Code
- **Prompt or context:** The user selected other machines on the plant floor.
- **What went wrong:** Every machine except M-204 showed "Go to M-204 alert", because Claude Code had limited the evidence view to M-204 for Gate 1. The user expected "Review evidence", to see past issues on that machine.
- **Caught by:** The user.
- **What changed:** Every machine now has "Review evidence". This brought forward the M-310 and F-118 states from Gate 2.
- **Evidence link or screenshot:** _to fill in_

## Shortened step 2 no longer matched the German

- **Date:** 2026-11-09
- **Tool:** Claude Code
- **Prompt or context:** Shortening the English plan steps.
- **What went wrong:** The shortened English for step 2 dropped the housing check and merged heat and play into what you feel when turning the shaft, so it no longer matched the German SOP.
- **Caught by:** The user.
- **What changed:** Step 2 now follows the German: check the housing for signs of heat and play, then turn the shaft by hand and feel for roughness.
- **Evidence link or screenshot:** _to fill in_

## Finishing the flow had no visible effect

- **Date:** 2026-11-09
- **Tool:** Claude Code
- **Prompt or context:** Review of what happens after "Save finding".
- **What went wrong:** The user noticed that finishing the flow had no visible effect.
- **Caught by:** The user.
- **What changed:** Decision: show the alert moving to Inspected and the finding added to machine history, rather than claiming the problem is solved, because no repair has happened.
- **Evidence link or screenshot:** _to fill in_

## Check mark on M-204 was unclear

- **Date:** 2026-11-09
- **Tool:** Claude Code
- **Prompt or context:** Inspected marker on the plant floor.
- **What went wrong:** Claude Code used a check mark as the inspected marker. The user reported an unexplained "v" on M-204 that did not go away.
- **Caught by:** The user.
- **What changed:** The check mark was replaced with a plain blue status dot beside the "Inspected" text, and removed from the phone header and Home panel.
- **Evidence link or screenshot:** _to fill in_
