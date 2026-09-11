# PulseLine

Early Warning Intelligence for Rural Healthcare

Detecting emerging financial and workforce instability before healthcare access deteriorates.

## Problem

Rural and safety-net hospitals can lose service lines, convert, or close after financial strain has already been visible in public filings. County and state healthcare leaders often see those signals too late, and in fragments.

## Product hypothesis

If Kentucky leaders can see **transparent financial distress** next to **honest data-quality limits**, they can investigate access risk earlier. A second signal — longitudinal workforce instability from historical NPPES snapshots — is planned. PulseLine will not treat a single financial ratio, or a missing workforce feed, as proof of closure or bankruptcy.

## Target users

County and state healthcare leadership in Kentucky. This is exploratory decision support, not a bedside or credit-rating tool.

## Current architecture

1. **Validation foundation** (`src/validate.ts`, `src/types.ts`) — unknown JSON in, structured errors/warnings out. Existing fictional fixtures stay under `tests/fixtures`.
2. **CMS extract** (`data/cms/ky-rural-hospital-extract.json`) — three observed Kentucky hospital summaries derived from public CMS HCRIS totals. Original field names are preserved in `sourceFields` / `sourceFieldMap`.
3. **Normalization** (`lib/normalize-hospital.ts`) — maps the extract to the hospital model. Missing financials stay null.
4. **Financial distress engine** (`lib/score-financial.ts`, thresholds in `lib/scoring-config.ts`).
5. **Workforce placeholder** (`lib/workforce.ts`) — `workforceStatus = "not_available"`.
6. **PulseLine signal** (`lib/pulse-signal.ts`) — will not trigger on finance alone.
7. **Dashboard** (`src/ui`) — Vite + React hospital radar, deep-dive drawer, methodology panel.

## Data sources

- Public CMS Hospital Cost Report (HCRIS) summaries for:
  - Kentucky River Medical Center (CCN `180139`)
  - Tug Valley ARH (CCN `180069`)
  - Pineville Community Health Center (CCN `180154`)
- Dollar figures are **rounded public totals**, not full CMS-2552 line-item cents.
- `Shadow_Revenue_source_pack.md` and `hospital_cost_report_candidates.json` are **not in the repository yet**. This schema is provisional until that extract is inspected.
- Simulated validator fixtures in `tests/fixtures` are fictional and are not CMS observations.

## Scoring methodology

Configurable in `lib/scoring-config.ts`. The UI does not hardcode thresholds.

Available factors (used only when the extract actually has the inputs):

| Factor | Construction | Direction |
| --- | --- | --- |
| Operating margin | Reported HCRIS operating margin | Lower is riskier |
| Revenue / expense pressure | `total_costs / total_revenues` | Higher is riskier |
| Liabilities / assets | `total_liabilities / total_assets` | Higher is riskier; skipped if liabilities are negative |
| Current ratio | current assets / current liabilities | Lower is riskier |
| Cash / liquidity | cash / operating expenses | Lower is riskier |
| Patient volume | inpatient days / bed days available | Lower is riskier |

Each available factor is linearly scaled to 0–100 risk between its `healthy` and `concern` anchors. The hospital score is the **weight-renormalized average** of available factors, rounded to an integer 0–100.

- 0–39 Stable
- 40–69 Watch
- 70–100 High Concern

Confidence is Low / Moderate / High from the count of available factors.

## Limitations

- Not a validated bankruptcy, closure, or 6–12-month forecast.
- Financial distress, service reductions, closure, conversion, acquisition, and bankruptcy are separate outcomes.
- NPPES does not establish hospital employment.
- A practice-location or address change does not prove a physician departure.
- Current assets, current liabilities, cash, and net patient revenue are **not in this extract** and are shown as unavailable, not zero.
- Three hospitals demonstrate workflow, not predictive validity.
- Combined PulseLine signal stays off until a longitudinal workforce feed exists.

## Current MVP status

Working vertical slice:

CMS hospital summaries → normalize → financial score → dashboard → hospital deep dive → deterministic explanation.

Not implemented: AI policy memo, PDF, map, auth, database, live NPPES detector, nationwide coverage, ML model.

## Next planned signal

NPPES workforce instability, using **historical snapshots**. Do not fabricate migration data before those snapshots exist.

## How to run locally

Requires Node.js 20+.

```bash
npm install
npm test
npm run typecheck
npm run lint
npm run build
npm run dev
```

Then open the local Vite URL (usually `http://localhost:5173`).

Validation CLI (fictional fixtures, not the CMS extract):

```bash
npm run validate -- tests/fixtures/simulated-cost-reports.json
```
