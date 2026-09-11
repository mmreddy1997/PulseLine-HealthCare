# PulseLine

Early Warning Intelligence for Rural Healthcare

A **historical financial prototype** for three Kentucky CAHs, plus a separate sourced structural-event timeline. It uses researched CMS cost-report rows. It does not detect emerging workforce instability and is not a validated early-warning or bankruptcy model. Workforce analysis, five-domain profiles, pre-event panels, and matched controls remain pending.

## Problem

Rural and safety-net hospitals can lose service lines, convert, or close after financial strain has already been visible in public filings. County and state healthcare leaders often see those signals too late, and in fragments.

## Product hypothesis

If Kentucky leaders can see **transparent historical financial stress** next to **honest data-quality limits** and a sourced event timeline, they can decide what to investigate. A second signal — longitudinal workforce instability from historical NPPES snapshots — is planned and is not implemented.

## Target users

County and state healthcare leadership in Kentucky.

## Current architecture

1. Financial research pack (`research/PulseLine_three_hospital_data.json`, evidence, dictionary, event log).
2. Financial adapter (`lib/adapt-research.ts`) converts 12 hospital-year reports, preserving original CMS strings, report record IDs, file cohorts, fiscal dates, and nulls. Null hospital/report rows and unresolved source IDs fail closed.
3. Extract validation (`lib/validate-extract.ts`) runs before normalize/score.
4. Scoring (`lib/score-financial.ts`, `lib/scoring-config.ts`).
5. Evidence ledger (`research/PulseLine_expanded_evidence_v1.json`) through `lib/adapt-evidence.ts`.
6. Dashboard (`src/ui`) shows the latest fiscal report per scored hospital, earlier reports, and a structural-event timeline that is not part of the score.

## Research-backed workflow

1. Read the three-hospital research pack and dictionary.
2. Keep `hospital_id` (Kentucky license key) as facility identity.
3. Keep each CMS `report_record_id` and actual `fiscal_start` / `fiscal_end`.
4. Parse original CMS numeric strings explicitly; reject malformed values.
5. Score only definitionally supported ratios from that fiscal report.
6. Do not mix Kentucky calendar-year utilization into CMS fiscal-year figures.
7. Load the expanded evidence ledger only through the typed adapter.
8. Show effective date, announcement date, scope, source link, and verification limits. A null publication date is not historical eligibility.

Scored hospitals:

- Breckinridge Memorial Hospital (`KY-LIC-600070`, CCN `181319`)
- Morgan County ARH Hospital (`KY-LIC-600058`, CCN `181307`)
- Kentucky River Medical Center (`KY-LIC-100620`, historical CCN `180139`, current CCN `181334`)

Research cohort, financial coverage pending (no invented CCN, license, financials, or score):

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

If no factor can be scored, score is null and status is **Insufficient data**.

## Structural events

Shown separately from the financial score.

- Highlands acquisition (2019-08-01) and rename share one event group.
- Paul B. Hall acquisition (effective 2021-12-01; announcement 2021-09-23) and rename share one event group.
- Kentucky River September 2021 property sale is a property transaction, not a verified provider CHOW.
- Quorum April 2020 bankruptcy and July 2020 emergence are parent events, not a verified Kentucky River hospital bankruptcy.

Hospital pressure (CMS fiscal reports / licensed beds) and community context (Floyd County CHNA figures) are separate. No new weighted convergence score, forecast, or NPPES departure inference was added.

## Limitations

- Revised CMS CSV publication dates are unverified.
- Reporting-entity vs parent consolidation is not independently reconciled.
- Kentucky River CCN transition effective date is unknown.
- Event-time CCNs and legal-entity crosswalks are unresolved for the research cohort.
- A null publication date excludes historical eligibility.
- Outcomes stay unknown unless a sourced event says otherwise.
- Workforce / NPPES, five-domain research, pre-event panels, and matched controls are pending.

## How to run locally

```bash
npm install
npm test
npm run typecheck
npm run lint
npm run build
npm run dev
```
