# PulseLine evidence expansion — engineering handoff
September 11, 2026

This is a partial, sourced research milestone, not a completed five-domain historical study. The companion JSON contains three case identities, five scoped events, five contextual observations and twelve source references. It is a separate research artifact, not compatible with the current dashboard adapter without deliberate integration. No app files, commits, pushes or deployment were changed.

## What the evidence supports

- **Highlands:** ARH confirms acquisition on August 1, 2019. Treat acquisition and rename as one event group. Earliest public announcement is still unresolved. [Official ARH profile](https://providers.arh.org/location/highlands-arh-regional-medical-center/loc0000132808).
- **Paul B. Hall:** ARH confirms acquisition in December 2021; contemporaneous reporting supplies December 1 and ownership/operations scope. The planned purchase was already reported September 23. For an unannounced-event experiment, September 22 is only a provisional latest daily cutoff; earlier disclosures still need investigation. [Official profile](https://providers.arh.org/location/paintsville-arh-hospital/loc0000131084), [closing report](https://www.wsaz.com/2021/12/01/appalachian-regional-healthcare-finalizes-purchase-paul-b-hall-regional-medical-center/), [agreement report](https://www.wymt.com/2021/09/23/arh-buy-paul-b-hall-regional-medical-center/).
- **Kentucky River:** NHI's filing places the property sale in September 2021; November 4 is the adviser's announcement. The filing reports $9 million including $0.7 million transaction costs and approximately $1.3 million **net loss**, not a confirmed impairment of that amount. This remains a property transaction, not a verified provider CHOW. [SEC release](https://www.sec.gov/Archives/edgar/data/877860/000087786021000075/item991-q32021earningsrele.htm), [adviser announcement](https://juniperadvisory.com/transactions/kentucky-river-in-jackson-ky/).
- **Quorum:** April 7, 2020 bankruptcy and July 7 emergence are parent events. The court list identifies Jackson Hospital Corporation, but the direct legal-entity-to-facility crosswalk remains a verification task. Do not display a verified Kentucky River hospital bankruptcy. [Quorum filing](https://www.sec.gov/Archives/edgar/data/1650445/000156459020016238/qhc-10k_20191231.htm), [emergence filing](https://www.sec.gov/Archives/edgar/data/1650445/000119312520188872/d942866d8k.htm), [court order](https://document.epiq11.com/document/getdocumentbycode/?docId=3645943&projectCode=QMH&source=DM).

The proposed 2020 NHI potential-impairment item is withheld from the verified ledger until its official filing is directly verified. A potential impairment, recorded impairment and realized sale loss must remain distinct.

## Beyond financial metrics

The Highlands CHNA supplies a small starting set: 192 licensed beds; Floyd County population 36,271, population change -8.1% over 2010–2017, age 65+ share 17.8%, and a primary-care ratio of 1,800 residents per provider. These are historical context, not proof of deterioration. The county values do not represent hospital employees. Report publication and the ratio's underlying measurement period remain unresolved. PDF text was checked; visual screenshot retrieval failed. The JSON excludes these observations from historical model features. [Highlands 2019 CHNA, printed pages 8, 10 and 12](https://www.arh.org/wp-content/uploads/2020/10/FINAL_HighlandsRMC_CHNA_2019.pdf).

Continue with [HRSA AHRF](https://data.hrsa.gov/data/download?AHRF=&data=AHRF) for county workforce measures and [Census ACS five-year vintages](https://www.census.gov/data/developers/data-sets/acs-5year.html?lv=true) for community measures. These endpoints were located, but their data were not imported. Preserve release dates, measurement windows, geography and ACS uncertainty. Current files containing old years are not automatically historically available files.

## Exact next build order

1. **Finish existing MVP reliability cleanup first.** Verify the research adapter rejects null entries and unresolved source references; remove advice referring to unavailable operating-margin factors; show very small valid liquidity values clearly; preserve report-switch focus. Re-run the existing checks and browser flows. Earlier review findings must be checked against the current code before editing.
2. **Add an evidence timeline, separately from scoring.** Use the companion ledger only through a validated adapter. Display source, scope, event date precision, announcement date and unresolved status. Preserve the existing dashboard cohort; introduce Highlands/Paintsville as research cases with financial coverage pending.
3. **Complete identity and timing research.** Verify event-time CCNs/legal entities, earliest announcements, CMS release dates and immutable source versions. Do not create placeholder financial scores for new cases.
4. **Collect a comparable pre-event panel.** Start with financial statements and utilization, then county workforce/access and community context. Require consecutive comparable periods before describing a change. Match periods, entity scope and metric definitions; keep patient-service expense pressure distinct from overall operating margin.
5. **Add contextual domain summaries.** Separate hospital pressure from community vulnerability. Show observed change, period, evidence and coverage; avoid a new weighted convergence score. County access scarcity is not hospital workforce departure.
6. **Build and assess comparison hospitals.** Only after case profiles are complete, document matched controls and equivalent event follow-up. Preserve unknown outcomes. Public deployment remains a later task.

## Historical evaluation contract

- Define each target separately: acquisition, property transfer, parent bankruptcy, provider CHOW, service reduction and closure are not interchangeable.
- Define a cutoff before first public target disclosure, then include only records demonstrably released before that cutoff. Retain the original version available then. Unknown publication means excluded, with a reason.
- Establish a genuinely financial-only baseline. Existing utilization contributions must be removed from that baseline for an honest comparison.
- Compare baseline plus utilization, then workforce/access; assess community vulnerability as a distinct consequence/context dimension. Structural context must predate the target and cannot encode the target itself.
- Match controls on rural/CAH status, size, geography, ownership, volume and baseline finances. Morgan and Breckinridge are candidates, not verified negative controls.
- Log search coverage, observation windows and censoring. A blank event log cannot create a negative outcome label.
- Two acquisition cases selected because of outcomes, sharing an acquirer, cannot establish predictive performance. Do not report accuracy, forecast lead time, causal effects or calibrated probabilities from this sample.
- First assess feasibility, coverage and whether domain evidence adds a distinct explanation. A larger independently selected panel and dated evaluation protocol are prerequisites for a performance study.

## Acceptance criteria before NPPES

The current dashboard remains usable; missing financials cannot produce a reassuring score; evidence references resolve; known-at dates control historical eligibility; property/parent/provider scopes are distinct; duplicate event descriptions do not inflate evidence; keyboard and mobile flows pass. NPPES address or enumeration changes must never be translated directly into physician departures.

## Readiness and remaining work

The previously reviewed local vertical slice is close to a shareable demo, subject to verifying the cleanup above. This research expansion is a separate, larger phase. Its five-domain profiles, pre-event panel, matched controls and validation are **not complete**. Do not delay the core demo for that research or present this handoff as proof of predictive ability.

The best immediate action is one focused Cursor pass on reliability and the sourced timeline. Success means someone can open a hospital, reconstruct its score and inspect the event's source and scope without assistance. If source dates or identities cannot be resolved, show the gap rather than filling it. After that milestone, take a short break and record a two-minute demo as the earned progress marker.

