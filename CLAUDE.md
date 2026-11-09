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
- The layout is a simple 2D plant floor. It is the main navigation. No 3D.
- Must work on desktop, tablet (768px and up) and phone (about 380px).
- The Gemini key lives only in a server-side function. It must never reach the browser or the repo.
- Show one persistent banner: "Demonstration environment. Equipment readings, incidents, and procedures are synthetic. Not for operational use."
- The UI says "Review and save inspection plan." Do not claim a technician reviewed it.
- Plain language in the UI. Avoid "AI-powered", "enterprise-grade" and similar claims.

## Design direction
A modern control surface for a plant, not an admin template.
- Dark theme with lifted blue-graphite surfaces. Tokens: page #111C28, panel #1A2937, raised #243648, text #E6EDF4, muted #A9B8C7, line #33475B (dividers only), control line #7A90A6 (control and equipment outlines), selection blue #7DB7E8, alert coral #F2786D.
- Color means state. Equipment is neutral when normal. Blue is selected, current or done. Coral is abnormal only, always with a shape and text. No green or amber.
- Depth comes from lighter surfaces, not heavy shadows. No identical card grids, gradients, all-caps labels or decorative motion.
- One font, Archivo Variable, with tabular numerals.
- All text and controls meet WCAG AA, with visible keyboard focus. Respect reduced motion.

Layout and flow:
- Tablet and desktop: plant floor always visible on the left, work panel on the right. Phone: one column with a compact machine header.
- Four-step progress on every flow screen: Machine, Evidence, Plan, Finding.
- One primary action per screen, always in the same place and in view: pinned at the bottom of the work panel, or in a fixed bottom bar on phone. The demo banner must not cover content.
- Phone: tap targets at least 44px, note field text at least 16px, fixed bar respects the safe area.

Content:
- Evidence opens with the alert, the readings against demonstration limits, then a side-by-side comparison of possible causes that says how to separate them. Never show confidence percentages or rank causes.
- A cause's "how to check it" comes from the SOP step it links to. Reading status is computed from value and limit.
- Lead with what happened. Record IDs are secondary. Sentence case, plain verbs, no em dashes, no filler.

## Not in v1
Predictive maintenance, live IoT or CMMS integrations, user accounts, assignment workflows, KPI dashboards, general chat, 3D twin.

## Working rules
- Implement one gate at a time. Propose a short plan before large changes.
- Add automated tests for every retrieval rule, including INC-2310 exclusion and superseded SOP exclusion.
- Make small commits with clear messages.
- After each meaningful AI mistake or direction change, add an entry to `PROCESS_LOG.md`: date, tool, prompt or context, what went wrong, what changed, evidence link or screenshot. Only record things that actually happened.
- List all third-party code, templates and data in `README.md` under Credits.
