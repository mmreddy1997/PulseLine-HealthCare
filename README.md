# PulseLine

Experimental evidence dashboard for rural Kentucky hospitals.

PulseLine helps county and state healthcare leaders, rural-health researchers, and community planners:

- Understand historical hospital financial indicators
- Compare available reporting years
- Examine documented structural events
- Ask questions about a hospital’s available evidence
- Download only the answers they choose

It does not predict bankruptcy, closure, acquisition, or service reduction.

> Because we believe your ZIP code should not determine the quality of care you receive.

## How to use PulseLine

1. Choose a hospital.
2. Explore reports and explanations.
3. Ask about the available evidence.
4. Download selected answers.

## Current architecture

1. Financial research pack (`research/PulseLine_three_hospital_data.json`, evidence, dictionary, event log).
2. Financial adapter (`lib/adapt-research.ts`) converts 12 hospital-year reports, preserving original CMS strings, report record IDs, file cohorts, fiscal dates, and nulls.
3. Extract validation (`lib/validate-extract.ts`) runs before normalize/score.
4. Scoring (`lib/score-financial.ts`, `lib/scoring-config.ts`). Thresholds and weights were not changed in this pass.
5. Evidence ledger (`research/PulseLine_expanded_evidence_v1.json`) through `lib/adapt-evidence.ts`.
6. Dashboard (`src/ui`) shows scored hospitals, research cases, and a hospital workspace with Overview, Reports, Events, and Ask.
7. PulseLine Ask (`lib/ask`, `src/ui/ask`) answers hospital-scoped questions with structured retrieval. An optional on-device model may only explain approved results.

No hospital map, geocoding, or Cards/Map toggle is included.

## Hospitals

Scored hospitals:

- Breckinridge Memorial Hospital (`KY-LIC-600070`, CCN `181319`)
- Morgan County ARH Hospital (`KY-LIC-600058`, CCN `181307`)
- Kentucky River Medical Center (`KY-LIC-100620`, historical CCN `180139`, current CCN `181334`)

Research cases, financial coverage pending (no invented CCN, license, financials, score, or reassuring status):

- Highlands Regional Medical Center / Highlands ARH (`case_highlands`)
- Paul B. Hall Regional Medical Center / Paintsville ARH (`case_paul_b_hall`)

## Scoring methodology

Configurable in `lib/scoring-config.ts`.

| Factor | Construction | Notes |
| --- | --- | --- |
| Operating margin | not calculated | Patient-care result is not a validated overall operating margin |
| Patient-service expense pressure | Less Total Operating Expense / Net Patient Revenue | Supported derived ratio; invalid if revenue ≤ 0 |
| Liabilities / assets | Total Liabilities / Total Assets | Excluded if liabilities or assets are uninterpretable |
| Current ratio | Total Current Assets / Total Current Liabilities | Excluded if current liabilities ≤ 0 |
| Cash / liquidity | Cash on Hand and in Banks / Less Total Operating Expense | Negative cash is preserved and excluded from the ratio |
| Patient volume | Total Days / Total Bed Days Available | CMS fiscal report only |

If no factor can be scored, score is null and status is **Insufficient data**. Status uses text, a distinct symbol, and color.

## Structural events

Shown separately from the financial score.

- Highlands acquisition (2019-08-01) and rename share one event group.
- Paul B. Hall acquisition (effective 2021-12-01; announcement 2021-09-23) and rename share one event group.
- Kentucky River September 2021 property sale is a property transaction, not a verified provider CHOW.
- Quorum April 2020 bankruptcy and July 2020 emergence are parent events, not a verified Kentucky River hospital bankruptcy.

Hospital pressure and community context are separate. No new weighted convergence score, forecast, or NPPES departure inference was added.

## Limitations

- Revised CMS CSV publication dates are unverified.
- Reporting-entity vs parent consolidation is not independently reconciled.
- Kentucky River CCN transition effective date is unknown.
- Event-time CCNs and legal-entity crosswalks are unresolved for the research cohort.
- A null publication date excludes historical eligibility.
- Outcomes stay unknown unless a sourced event says otherwise.
- Workforce / NPPES, five-domain research, pre-event panels, and matched controls are pending.

## PulseLine Ask

Ask is a hospital-specific helper. Suggested questions, free-text lookup, follow-ups, copy, and answer-only PDF export work without downloading a model. Facts and calculations are produced by application code. The language model never invents or recalculates financial values.

If a device cannot run the optional model, Ask continues as **data lookup**. That label is shown on each answer. Conversations are scoped to the selected hospital, can be cleared, and are not persisted after the tab is closed.

Answer PDFs are generated in the browser and include only completed, selected answers: hospital name, questions, statements, periods, sources/report IDs, limitations, export date, and an experimental-use note.

## On-device model

Default helper: **Llama 3.2 1B Instruct**, 4-bit MLC build `Llama-3.2-1B-Instruct-q4f16_1-MLC`.

| Topic | Detail |
| --- | --- |
| Runtime | [WebLLM](https://github.com/mlc-ai/web-llm) (`@mlc-ai/web-llm`), Apache-2.0 |
| Why this model | Small enough for a first load, official MLC browser build, worker support |
| Download | Official MLC size is about 700 MB. In local preview, WebLLM reported 412 MB fetched at 62% after 7 seconds (~665 MB implied). The download was stopped before completion. |
| Cancel | **Cancel download** terminates the WebLLM worker. Ask stays on data lookup. |
| Hardware | WebGPU (Chrome / Edge 113+). No mobile-performance claim until physically tested |
| Fallback | If WebGPU is missing, load fails, or the user cancels, Ask stays on data lookup |
| License | Llama 3.2 Community License for the weights; do not redistribute the weights inside this repo |
| Privacy | Inference stays on the visitor device. Questions are not sent to a remote model API |

GitHub Pages still hosts only the static app. Model files are fetched by the browser when the visitor chooses **Load on-device helper**. Hugging Face must remain reachable for that optional path.

## Browser support

- Landing, hospital workspace, suggested questions, data-lookup answers, and PDF export: current Chrome, Edge, Firefox, and Safari with JavaScript enabled.
- Optional on-device helper: WebGPU required. Firefox and Safari may be unavailable; the data-lookup path remains.
- Viewport checks in development are not a substitute for a physical phone.

## GitHub Pages

Build with `PAGES_BASE=/PulseLine/` and publish the `dist/` folder. No server, database, account, or secret API key is required. The optional model download is a visitor-side request to Hugging Face, not part of the Pages artifact.

## How to run locally

```bash
npm install
npm test
npm run typecheck
npm run lint
npm run build
npm run dev
```
