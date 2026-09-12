# Historical case protocol and claim-verification queue

Prepared 2026-09-12. Scope: research documentation only; no application, scoring or observed dataset changes. Input: user-supplied five-hospital analysis. Verification status below refers to this new material, not earlier separately sourced observations.

## First task

Verify Paul B. Hall's legal operating entity and two acquisition dates. Retrieve the buyer/hospital announcement and a completed-transfer record. Record both announcement and effective dates, exact document URLs, page/paragraph references and legal entities. Do not infer a transfer from branding or a proposed agreement. Success is a documented timeline or explicit unresolved fields—not a required positive event finding.

## Claim queue

All rows below are supplied claims pending primary-source verification. Approximate amounts must remain approximate. Do not import them as validated numeric facts.

| ID | Hospital | Supplied claim | Verification action |
|---|---|---|---|
| PBH-01 | Paul B. Hall | Paintsville Hospital Company, LLC operated Paul B. Hall | Find SEC exhibit or legal filing linking entity and facility; record historical CCN/EIN separately |
| PBH-02 | Paul B. Hall | Quorum/Paintsville entity involved in April 2020 Chapter 11 | Verify petition, debtor list, filing date, case number and hospital linkage; parent bankruptcy is distinct from a hospital debtor filing |
| PBH-03 | Paul B. Hall | Acquisition announced September 23, 2021; transfer December 1, 2021 | Retrieve announcement and completed-transfer evidence; search earlier public sale discussions |
| PBH-04 | Paul B. Hall | FY2020 impact material: 72 beds and average daily census around 18 | Locate original CMS release, field definitions and underlying data year; do not label publication-year material as measured FY2020 without checking |
| HIG-01 | Highlands | Merger plans September 2017; purchase agreement April 2019; acquisition August 1, 2019 | Retrieve dated announcement, agreement and closing evidence; later court accounts may establish events but not contemporaneous availability |
| HIG-02 | Highlands | Revenue about $87.8M/$82.7M/$81.3M in 2016/2017/2018; FY2018 expenses about $82.0M, loss about $725K, assets $51.8M, liabilities $31.9M | Retrieve IRS returns for correct EIN; establish tax periods, filing/public availability dates and organizational scope |
| HIG-03 | Highlands | One-star CMS rating and Leapfrog D around 2019 | Retrieve dated releases if retained; quality is not financial distress and is outside the first minimal comparison |
| KR-01 | Kentucky River | Quorum bankruptcy April 2020 and emergence July 2020; NHI landlord/operator arrangement | Verify entity relationships and restructuring records separately from provider ownership |
| KR-02 | Kentucky River | NHI property sale September 2021 for $9M; about $1.3M impairment plus costs | Verify SEC property identification, transaction date and accounting definitions; do not call this a hospital CHOW |
| MOR-01 | Morgan County | FY2020: 148 discharges, 1,352 days, approximately 14.8% occupancy and −4.1% margin | Reconcile original HCRIS report/fiscal dates and exact formulas; secondary source figures remain unverified |
| MOR-02 | Morgan County | Historical primary-care HPSA designation | Retrieve historical designation type/geography/status/dates; county designation may not apply to every resident |
| BRE-01 | Breckinridge | Years of losses, approximately one week of cash flow, unsuccessful tax-support effort reported January 2020 | Read full contemporaneous report and locate underlying financial/support records; cash-flow phrase is not standardized days cash on hand |
| BRE-02 | Breckinridge | IRS net income approximately −$1.62M, −$1.47M, −$487K, +$703K, +$2.38M for 2016–2020 | Verify original returns, entity scope and availability; net income differs from operating income |
| CMP-01 | Morgan/Breckinridge | No equivalent acquisition established; continued operation/independence | Search defined outcome/follow-up window; record sources and coverage. No identified record is not confirmed absence |
| COM-01 | Johnson/Floyd/Breckinridge counties | 2010→2020 population: 23,356→22,680; 39,451→35,942; 20,059→20,432 | Verify Census series, geography and release dates. 2020 counts cannot enter a 2019 historical prediction |

## Observation record specification

| Field | Rule |
|---|---|
| claim_id / observation_id | Stable unique record key |
| hospital_id and historical identifiers | Documented CCN/license/EIN validity, with unresolved matches flagged |
| entity_name / entity_scope | Hospital, cost-report complex, operator, parent, property owner or county |
| metric / raw_value / units | Original wording and value; null distinct from zero |
| reporting_start / reporting_end | Actual observation period, not filename year |
| source_url / document_title / location | Exact URL and page, table, row or paragraph |
| publication_date / first_public_available_at | Separately verified dates; null if unknown |
| accessed_at | Date researcher actually accessed document; receiving a pasted citation is not document access |
| source_vintage / report_status | Release version and submitted/settled/amended state where supplied |
| verification_status | supplied_lead, verified, conflicting, unresolved or not_found_in_search |
| cutoff_eligibility | eligible only with evidence of availability before cutoff; otherwise unknown/ineligible |
| calculation / input_ids | Formula and compatible raw observations for any derived measure |
| limitations | Missingness, geography, scope, uncertainty and comparability issues |

## Event record specification

Maintain separate categories: acquisition announcement, acquisition completed/provider CHOW, legal bankruptcy filing, restructuring, hospital closure, service-line reduction, property sale and regulatory classification change. Store announcement date, filing date and effective date independently. A later event may be the outcome while an earlier distinct event is an input; never use the outcome's announcement as evidence of predicting that announcement.

## Paired collection and evaluation

1. Verify identities and event dates before extracting the full financial panel.
2. Define the Paul B. Hall pre-announcement cutoff; use the identical cutoff for Morgan. Define and document the comparison follow-up horizon before assigning negative labels.
3. Retrieve 2017 onward report periods for which source availability can be established by the cutoff. A FY2021 report ending before the cutoff may still have been filed later.
4. Preserve source originals. Use financial-only fields first, then the same financial observations plus structural/workforce/community context. Do not silently drop different missing rows in each comparison.
5. Mark audited/settled revisions downloaded today as retrospective reconstructions until a contemporary release supports availability. Do not use current data to fill historical workforce counts or classifications.
6. Show paired trajectories with missing periods visible. Record alternative explanations, including COVID effects, scale, service mix and system support. No claim of differentiation until the matched values have actually been compared.
7. Treat two-hospital findings as descriptive. A broader event-ascertained cohort is needed for false-positive rates, specificity, lead-time claims or model validation.

## Privacy and ownership of work

Use free public institutional and aggregate sources. No patient-level information or personal clinician histories. Flag any proposed identifiable NPPES history as a scope change before collection. Engineering owns the app and implementation; research owns provenance, definitions, verification and interpretation.

This protocol adds no risk score, changes no existing outcome label, and does not establish that all five domains changed or were independent. The supplied narrative is a research lead, not proof that a model works.
