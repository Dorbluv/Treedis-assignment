# Maintenance Copilot: Treedis take-home

## What this is
A working prototype for the Treedis AI PM take-home. All data is synthetic.

**Promise:** from a machine alert to an evidence-backed inspection plan, without searching disconnected maintenance records.

**User:** a maintenance technician handling the first investigation after an alert, usually on a phone.

**Hypothesis:** technicians lose time connecting fragmented records to the right physical equipment. This is unproven. Never present it as fact in the UI or docs.

## The one flow that must work
1. Open the plant layout and see an abnormal-vibration alert on motor M-204.
2. Select M-204. Its parent conveyor C-204 and sibling gearbox G-204 are visibly related on the layout.
3. Review the evidence, with a label explaining why each record was included or excluded.
4. Open a source: ID, asset, language, original excerpt, English explanation, relevance, limitation.
5. See possible causes, never a diagnosis.
6. Review and save an inspection plan based on the applicable current SOP.
7. Record a finding. The plan, evidence references and finding survive a refresh.

## Retrieval rules
Retrieval is deterministic and uses structured equipment metadata, not embeddings. AI must never change these results.

| Record relationship | Treatment |
|---|---|
| Exact selected asset | Eligible: "Direct asset history" |
| Parent assembly | Eligible when relevant: "Assembly-level context" |
| Sibling component | Excluded from direct evidence unless the record explicitly links the two |
| Same equipment type elsewhere | Optional comparison, never this asset's history |
| Superseded SOP | Excluded from the plan; shown as superseded if surfaced |
| Unknown applicability | Flagged as uncertain, never silently applied |

Evidence authority:
- Sensor reading: an observed demo condition.
- Incident: a possible explanation only.
- Shift note: an unverified technician observation.
- Current applicable SOP: the only source that can create inspection steps.
- Technician finding: what was observed in this inspection.

## Synthetic dataset
Assets:
- C-204 conveyor, parent of M-204 and G-204
- M-204 motor, main scenario
- G-204 gearbox, sibling of M-204
- M-310 motor, has an applicable SOP but no incident history
- F-118 filler, has incident history but no applicable SOP

Records:
- INC-2291, English, M-204: bearing wear after high vibration
- INC-1877, German, M-204: lubrication problem with similar vibration
- INC-2310, English, G-204: contains "vibration"; must be excluded as direct motor evidence, and the UI shows the keyword match next to the exclusion reason
- ASM-0412, English, C-204: assembly-level alignment context
- NOTE-5521, English, ambiguous "motor on line 2 noisy": unknown applicability
- SOP-014 rev C, German, M-204: current; provides the inspection steps
- SOP-014 rev B, German, M-204: superseded
- SOP-022, English, M-310: current
- INC-1650, English, F-118: incident history only
- SR-M204-01, SR-M310-01, SR-F118-01, English: synthetic readings behind the alerts on M-204, M-310 and F-118
- Each German record stores a prepared English explanation so Gate 1 works without AI.

Missing-evidence states:
- M-310, no incident history: "Insufficient asset-specific evidence to recommend a likely cause." The SOP remains available.
- F-118, no applicable SOP: no plan is generated. Show the gap and route to site-approved escalation.

## Build gates
Do not start a gate until the previous one passes.

**Gate 1: useful without AI.** Layout, equipment relationships, retrieval, evidence viewer, plan creation, finding saved across refresh.
Test: a reviewer can select M-204, understand why records were included, open the SOP, save a plan and record a finding.

**Gate 2: limits demonstrated.** M-310 and F-118 states, superseded SOP handling, asset switching with no stale state, direct versus assembly labels.
Test: the product never invents a cause or a procedure to complete the workflow.

**Gate 3: AI improves the experience.** A Gemini summary over already-retrieved evidence, citation validation, and a clearly labeled fallback. Add up to three contextual follow-up prompts only if time remains.
Test: AI makes evidence easier to understand without changing applicability or procedural authority. A citation must exist and its excerpt must actually support the claim.

## Technical constraints
- Vite, React and TypeScript. Records in local JSON. Saved state in localStorage.
- `npm install` then `npm run dev` must run the app. Also deploy to a public URL.
- The layout is an isometric plant floor drawn in SVG. It is the main navigation. No real 3D.
- Must work on desktop, tablet (768px and up) and phone (about 380px).
- The Gemini key lives only in a server-side function. It must never reach the browser or the repo.
- Always show the demo text once: "Demo with synthetic data. Not for operational use." It sits in the top bar at 768px and up, and under the primary action on phone.
- The UI says "Review and save inspection plan." Do not claim a technician reviewed it.
- Plain language in the UI. Avoid "AI-powered", "enterprise-grade" and similar claims.

## Design direction
An alert workspace for a technician at the machine, often on a phone, in a hurry. Every screen answers: what is wrong, where is it, what do I check, how do I stay safe.

Tokens:
- Dark: page #101D2B, floor #162839, floor grid #223A4F, divider #243A4E, dark label #0B1520, text #EAF1F6, secondary #BFCDD9, muted #9FB2C2.
- Light work panel: surface #F3F6F8, card #FFFFFF, line #D6DFE6 (dividers only), ink #17242F, secondary #2C3D4B, muted #4F6170 (also control borders, for 3:1).
- Action teal #0F6E66, hover #0A524C. Done pill #D9EDE9 with #0A524C. Future pill #E2E9EE with #3E505F.
- Alert coral on dark #FF8F7E, light text on dark #FFB4A8, alert on light #A63A2B.
- Machine faces, normal: top #7FA3B8, left #4E7186, right #3B596C. Selected: top #FF8F7E, left #BF5A4C, right #94433A. Conveyor: top #46586B, left #2C3A49, right #223040, belt marks and outline #75899C.
- Line 1 zone #1F4A52 at 40%, stroke #3E8A86, label #7FE0D3. Line 2 zone #2A3B5E at 50%, stroke #6C7FC4, label #B4C0F0.

Type and color rules:
- Sora 500 and 600 for headings and big numbers. Instrument Sans 400 to 600 for everything else. Packaged, credited in the README, tabular numerals.
- Sentence case. No all-caps, no em dashes.
- Coral is for abnormal state only, always with its triangle and text. Only the selected machine gets the coral body. Connected equipment gets a light outline.
- The only motion is the conveyor belt marks and the marker appearing after a save, both stopped under reduced motion.
- All text and controls meet WCAG AA, with visible keyboard focus. Measure before changing a token.

Layout:
- Desktop, 1024px and up, no page scroll where it fits: dark top bar with the alert queue and demo text. Left: plant floor with one legend and a one-line activity strip. Right: light panel, 520 to 620px, scrolling internally.
- Tablet, 768 to 1023px: floor on top at limited height, panel below, primary action fixed at the bottom.
- Phone, under 768px: dark header with "3 alerts", h1, status line and the floor cropped to the selected machine. Readings, safety callout, tabs, then content. Home shows the full floor. Primary action fixed at the bottom, safe-area aware.
- One primary action, chosen by state: Start inspection plan, Save inspection plan, Save finding, Back to plant floor. Top right of the panel on desktop.
- Tabs are real ARIA tabs: Investigate, Inspection plan, Finding. Finding is inactive until the plan is saved. With no applicable SOP the plan tab reads "No procedure" and is blocked, whatever the URL or saved data says.
- Status pills come from saved state: Alert raised, Investigating, Inspected, Repair, Closed. With no procedure: Alert raised, Investigating, Escalated, Site review, Closed. Nothing ever claims the machine is solved.
- A source opens as a slide-over, full screen on phone.
- Targets 24px minimum, 44px on phone. Note field text at least 16px. Focus moves to the h1 when the machine changes, and the page title updates on every view.

Content:
- Investigate shows the readings against demonstration limits, then compact cause cards, then the records checked. Never show confidence percentages or rank causes. Evidence rows are collapsed by default on alert machines, with a count and preview.
- A cause's check comes from the SOP step it links to. Reading status is computed from value and limit. The records checked count is computed from the data.
- The safety callout appears only when the applicable SOP's first step is lockout.
- The plan shows numbered steps with short titles, and an English / Deutsch switch that shows the whole plan in one language.
- Activity shows only real events. Alert age and start time are synthetic data fields. Save events use real timestamps.
- Every machine panel shows a snapshot: status and key reading, past incidents, procedure, connected equipment.
- Lead with what happened. Record IDs are secondary. Plain verbs, no filler.

## Not in v1
Predictive maintenance, live IoT or CMMS integrations, user accounts, assignment workflows, KPI dashboards, general chat, 3D twin.

## Working rules
- Implement one gate at a time. Propose a short plan before large changes.
- Add automated tests for every retrieval rule, including INC-2310 exclusion and superseded SOP exclusion.
- Make small commits with clear messages.
- After each meaningful AI mistake or direction change, add an entry to `PROCESS_LOG.md`: date, tool, prompt or context, what went wrong, what changed, evidence link or screenshot. Only record things that actually happened.
- List all third-party code, templates and data in `README.md` under Credits.
- Never use em dashes in any file, UI text or message.
- Every number in the UI or docs is sourced, computed, or labeled as a demonstration value. The on-screen synthetic data banner covers synthetic readings, except limits, which stay labeled.
- Stop and ask before changing anything on my accounts.
- Label claims in docs as given, hypothesized, assumed or synthetic. Keep each fact in one place. Do not use unverified secondhand claims.
- Before any large change, list gaps and assumptions explicitly.
- Keep logic checks at unit level. End-to-end checks are only for real user flows.
- Passing tests do not prove usability. I make the final call on every gate.
- In PROCESS_LOG.md, record who caught each issue: me, Claude Code, or another named tool.
