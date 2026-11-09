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

## UX review against WCAG 2.2 and Nielsen's heuristics

- **Date:** 2026-11-09
- **Tool:** Claude chat
- **Prompt or context:** UX review of `gate-1`, requested by the user.
- **What went wrong:** The review found focus, target-size and navigation gaps.
- **Caught by:** Claude chat, at the user's request.
- **What changed:** Focus moves to the heading and the page title updates on every step change. The logo and standalone links are at least 24px high. Completed progress steps link back with saved data intact. The disabled "Save finding" says why, connected for screen readers.
- **Evidence link or screenshot:** _to fill in_

## Decision: deploy before adding AI, on Cloudflare Workers

- **Date:** 2026-11-09
- **Decided by:** The user.
- **Decision:** Deploy before adding AI, to reduce delivery risk, and host on Cloudflare Workers because Vercel's free plan restricts commercial use (given by the user).
- **Evidence link or screenshot:** _to fill in_

## Cloudflare GitHub app uninstalled during deployment

- **Date:** 2026-11-09
- **Tool:** Claude Code
- **Prompt or context:** Deploying `main` to Cloudflare Workers from the user's Chrome.
- **What went wrong:** Claude Code uninstalled the existing Cloudflare GitHub app on the user's account during deployment, so the app could be reconnected.
- **Caught by:** The user.
- **What changed:** New rule from the user: stop and ask before changing anything on their accounts.
- **Evidence link or screenshot:** _to fill in_

## Gate 2 layout problems found in browser review

- **Date:** 2026-11-09
- **Tool:** Claude Code
- **Prompt or context:** Gate 2 browser review at 380px, 768px and 1366x768.
- **What went wrong:** With three alerts on the floor, the G-204 and C-204 relationship text fell below the fixed button at 380px. At 768px, "Line 2" wrapped once the Escalated legend item appeared.
- **Caught by:** Claude Code.
- **What changed:** The machine title and status share a line, the sibling line is shorter, and the zone name no longer wraps.
- **Evidence link or screenshot:** _to fill in_

## Legend placement, F-118 flow and empty machine screen

- **Date:** 2026-11-09
- **Tool:** Claude Code
- **Prompt or context:** User review of Gate 2.
- **What went wrong:** The legend sat inside one line, F-118's shorter flow had no visible reason, and the M-310 machine screen looked empty.
- **Caught by:** The user.
- **What changed:** The legend sits above Line 1 and lists every status. Machines with no procedure keep the four-step structure, with Plan shown as blocked. Every machine screen shows a snapshot built from data.
- **Evidence link or screenshot:** _to fill in_

## Snapshot and blocked step did not fit at phone width

- **Date:** 2026-11-09
- **Tool:** Claude Code
- **Prompt or context:** Browser review of the Gate 2 fixes at 380px.
- **What went wrong:** The new machine snapshot fell below the fixed button, by up to 110px. "No procedure" also ran into "Finding" in the progress bar, which the measured checks missed and a screenshot showed.
- **Caught by:** Claude Code.
- **What changed:** On phone, a selected machine shows only its own group on the floor. The blocked step has more room.
- **Evidence link or screenshot:** _to fill in_

## Wizard replaced with an alert workspace

- **Date:** 2026-11-09
- **Tool:** Claude for comparing design directions, Claude Code for the rebuild
- **Prompt or context:** User review of the working Gate 2 wizard.
- **What went wrong:** The user rejected the working wizard as too junior to be a real product.
- **Caught by:** The user.
- **What changed:** We kept the tested logic and replaced the UI model with an alert workspace, after comparing three design directions in Claude.
- **Evidence link or screenshot:** evidence/1366-02-investigate.png

## Saved data could have shown a procedure on F-118

- **Date:** 2026-11-09
- **Tool:** Claude Code
- **Prompt or context:** Writing the test that F-118 can never reach a plan.
- **What went wrong:** The first workspace code used the SOP named in a saved plan before checking that the machine had an applicable SOP. A saved entry for F-118 naming another SOP would have unlocked its plan tab.
- **Caught by:** Claude Code.
- **What changed:** A saved plan is only read when an applicable SOP exists. A unit test covers forged saved data.
- **Evidence link or screenshot:** src/App.test.tsx, "can never reach a plan through forged saved data"

## Screenshot review of the workspace

- **Date:** 2026-11-09
- **Tool:** Claude Code
- **Prompt or context:** Reviewing the workspace at 380px, 768px and 1366x768 after all tests passed.
- **What went wrong:** The Line 1 and Line 2 names were hidden behind machines. On phone, coral appeared without a triangle, the activity text was cut mid-word, and Home said "Plant floor" twice. The headline lost the machine ID after a save. Script focus drew a box around the h1.
- **Caught by:** Claude Code.
- **What changed:** Zone names moved to open floor and are hidden when a crop would cut them. The coral text now has a triangle or uses a neutral color. The activity line wraps on phone, the location line names the machine after a save, and the h1 has no focus box because it is not a tab stop.
- **Evidence link or screenshot:** evidence/380-05-saved.png

## Coral on a selected machine with no alert

- **Date:** 2026-11-09
- **Tool:** Claude chat for the design spec, Claude Code for the build
- **Prompt or context:** Review of the alert workspace on the redesign branch.
- **What went wrong:** Selecting G-204 or C-204 painted a healthy machine coral, although coral must mean abnormal only. The error was in Claude chat's own design spec, which gave every selected machine the coral body, and Claude Code built it as written.
- **Caught by:** Claude chat.
- **What changed:** A selected machine with no alert gets a teal-tinted body and a bright outline. Coral stays on selected machines with an active alert. A unit test covers both.
- **Evidence link or screenshot:** src/App.test.tsx, "selection color"

## Declined to record an uninstall claim it could not support

- **Date:** 2026-11-09
- **Tool:** Claude Code, with the claim coming from Claude chat
- **Prompt or context:** A log request from Claude chat, passed on by the user, said Claude Code had uninstalled the Cloudflare GitHub app during deployment without asking first.
- **What went wrong:** The claim was inaccurate. Claude Code had asked, and the user had replied "do what ever you need to finish with it".
- **Caught by:** Claude Code.
- **What changed:** Claude Code refused to record the "without asking" wording. It logged the uninstall without that phrase and told the user why.
- **Evidence link or screenshot:** The "Cloudflare GitHub app uninstalled during deployment" entry in this file.

## First real Gemini runs: all 9 failed

- **Date:** 2026-11-09
- **Tool:** Claude Code, calling the Gemini API
- **Prompt or context:** First real run of Gate 3, 3 runs each on M-204, M-310 and F-118, with `gemini-3.8-flash`, thinking level low and the 8-second timeout.
- **What went wrong:** 0 of 9 calls returned a summary: 7 timed out at 8 seconds and 2 returned HTTP 503. A diagnostic on M-204 with a 40-second limit, 2 calls per setup, gave: `gemini-3.8-flash` low, one 503 and one no answer in 40 seconds. `gemini-3.6-flash` minimal, one 503 and one answer in 13.5 seconds. `gemini-3.6-flash` low, one 503 and one no answer in 40 seconds. `gemini-3.5-flash-lite`, 2 answers in 1.4 to 1.8 seconds. The 503 message reported high demand on the model.
- **Caught by:** Claude Code.
- **What changed:** The model is now `gemini-3.5-flash-lite`, with the 8-second timeout unchanged. The diagnosis covers one afternoon of free-tier traffic, so it does not show that the other models are always slow.
- **Evidence link or screenshot:** evidence/gate-3/model-runs-first.json, evidence/gate-3/model-diagnostic-1.json

## Debugging loop: a past incident written as a diagnosis

- **Date:** 2026-11-09
- **Tool:** Claude Code, calling `gemini-3.5-flash-lite`
- **Prompt or context:** First prompt (v1, saved in evidence/gate-3/model-runs-first.json) said a cause may appear "only as a possible cause or as something seen in a past record".
- **What went wrong:** Both M-204 calls in the diagnostic returned "Increased vibration was traced to insufficient bearing lubrication." The sentence names a cause and does not mark it as possible or past. The diagnosis check rejected it, so the prepared summary would have been shown.
- **Caught by:** Claude Code's validator, in a real model run.
- **What changed:** The check stayed as it was. Prompt v2 requires a sentence naming a cause to say "possible" or "past record", gives one example, and forbids "traced to", "caused by" and "due to".
- **Better output:** 9 of 9 runs passed validation in 0.8 to 4.1 seconds. M-204 returned "A past record lists bearing wear as a possible cause." M-310 returned the required insufficient-evidence sentence every time and named no cause.
- **Remaining limit:** The model copies the prompt's example almost word for word, and M-204 no longer states its readings. Passing validation does not show that it is useful. The next entry covers two further problems with this output.
- **Evidence link or screenshot:** evidence/gate-3/model-diagnostic-1.json, evidence/gate-3/model-runs-prompt-v2.json

## Two problems the validators missed in real output

- **Date:** 2026-11-09
- **Tool:** Claude Code, calling `gemini-3.5-flash-lite`
- **Prompt or context:** Reviewing real output after prompt v2 passed 9 of 9.
- **What went wrong:** In the app, F-118 showed "Nozzle pressure is 3.8 bar with a limit of 3 bar on this filler." It passed every check but dropped the required "demo" label. After prompt v3 fixed that, one M-204 run named only bearing wear and left out lubrication, which reads as ranking the causes. It also passed every check.
- **Caught by:** Claude Code, the first in a screenshot review and the second reading raw run output.
- **What changed:** Two new checks: every limit must be called a demo limit, and a summary must name all allowed causes or none. Prompts v3 and v4 say the same. The final v4 run passed 8 of 9 in 0.8 to 1.8 seconds. The one failure was M-310 run 1, where the model misspelled the required sentence as "recommend a likey cause". The instruction check rejected it because the exact phrase no longer matched, so the prepared summary would have been shown. That rejection was for an accidental reason, and I did not tune the check around one typo.
- **Evidence link or screenshot:** evidence/gate-3/limit-unlabeled-1366-F-118.png, evidence/gate-3/model-runs-prompt-v3.json (M-204 run 1), evidence/gate-3/model-runs-prompt-v4.json

## Prompt v5: the summary stops repeating the screen

- **Date:** 2026-11-09
- **Tool:** Claude Code, calling `gemini-3.5-flash-lite`
- **Prompt or context:** After prompt v4 the output mostly repeated the readings and cause cards.
- **What went wrong:** The summary was valid but added little. Claude Code flagged this in its report.
- **Caught by:** Claude Code flagged it, and the user chose the change.
- **What changed:** Prompt v5 returns at most two sentences: what the records have in common or where they differ across all allowed causes, and what they cannot tell the technician about the current fault. M-310 keeps the insufficient-evidence sentence and then states what is missing. A new check rejects a sentence that only restates a reading. All earlier checks stay. "Cannot confirm" now counts as a negation, so stating a limit of the evidence is not read as a diagnosis. The prepared fallback was rewritten to the same job, because its old text restated readings and would have failed the new check.
- **Result:** 9 of 9 real runs passed validation in 0.9 to 2.0 seconds.
- **Remaining limits:** Sentence 1 usually lists the causes and does not say how the records compare. One M-204 run wrote "lubrication problem" with no article. "These records cannot tell what is happening now" is vague. None of these fail a check.
- **Evidence link or screenshot:** evidence/gate-3/model-runs-prompt-v5.json

## Public URL check after adding the Gemini secret

- **Date:** 2026-11-09
- **Tool:** Claude Code, with scripted requests and Chrome against the public URL
- **Prompt or context:** The user added `GEMINI_API_KEY` in the Cloudflare dashboard and asked for verification at commit 4de82d1.
- **What was found:** M-204, M-310 and F-118 each returned a Gemini summary. Through the UI each was labeled "Generated by Gemini from the records below". G-204 and C-204 returned `{"source":"none"}`, and in Chrome they sent no summary request and showed no block. The M-204 flow from alert to saved finding completed and survived a refresh at 380px, 768px and 1366x768, with no page errors. F-118 escalated and had no plan.
- **Cache:** The first call per alert took 0.8 to 1.4 seconds. Later calls took 10 to 50 ms with identical text, including 12 sent at once. After 25 idle minutes, calls took 21 to 109 ms with the same text, so no new model call happened.
- **Cache API on workers.dev:** Not proven. The results show the cache working, but they cannot tell the isolate's memory from the Cache API, because the isolate may have survived the idle period. Telling them apart needs a temporary response header or Worker logs, and neither was in scope.
- **Limit of this check:** "No model call" for G-204 and C-204 rests on the `none` response, the unit tests and the absence of a browser request. Google's side was not inspected. All requests came from one Cloudflare data center.
- **Also seen:** The live cache holds two sentences that are not in the review table, because they came from a later call than the recorded runs: "The records do not contain historical fault occurrences for this machine." and "These records cannot tell the technician why the pressure is high now."
- **Caught by:** Claude Code.
- **Evidence link or screenshot:** evidence/gate-3/live-check-first.json, evidence/gate-3/live-check-after-idle.json, evidence/gate-3/live-1366-M-204.png

## Prompt v6 missed the merge bar and was not shipped

- **Date:** 2026-11-09
- **Tool:** Claude Code, calling `gemini-3.5-flash-lite`
- **Prompt or context:** The user asked for a sentence comparing what was physically found, a second naming one true gap, and a merge only if at least 8 of 9 real runs passed.
- **What changed on the branch:** Incidents gained symptoms and found-condition fields taken from their own excerpts. Gaps are computed from the data and the model may only name one of them. Sentence 1 may not repeat a reading, date, fix or downtime. M-310 shows only what is missing. Citations from German records are marked. Retrieval selection, labels, reasons and causes were identical to main for all assets.
- **What went wrong:** 7 of 9 runs passed, below the bar of 8. M-204 run 2 had a sentence over the 110-character cap. F-118 run 1 put two sentences in one entry: "A past incident showed a blocked nozzle on this filler. These are from a past record." That second sentence echoes the prompt's own wording, "Say that these are from a past record".
- **Passed but imperfect:** F-118 run 2 put a record ID in the sentence text, which the prompt forbids and no check catches. "Past incidents or failure findings on this machine are missing today." reads awkwardly.
- **Caught by:** Claude Code's validators, in real model runs.
- **What happened next:** v6 was left unmerged on the `summary-v6` branch at cae457f, and the live v5 was kept. The prompt was not adjusted and rerun, because that would have bypassed the agreed bar.
- **Evidence link or screenshot:** evidence/gate-3/model-runs-prompt-v6.json
