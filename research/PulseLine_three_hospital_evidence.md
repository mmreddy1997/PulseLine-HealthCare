# PulseLine — three-hospital evidence pack

Collected September 11, 2026. 12 hospital cost reports across four annual file cohorts. No risk scores or distress labels assigned. This expands the earlier source-only guides.

## Important matching and scope findings

- Breckinridge: current and historical CCN 181319. Current CMS ownership is Government - Local; historical cost-report ownership may differ. Do not infer an acquisition from category differences.
- Morgan County: current and historical CCN 181307.
- Kentucky River: current CCN 181334; historical reports use 180139. CAH designation announced January 7, 2025; exact CCN switch date remains unknown. Historical 400 Jett Drive differs from current 540 Jett Drive. Do not apply current CAH status retroactively.
- 2025 Kentucky River utilization appears in Table 1 rather than the CAH Table 1A. Preserve that inconsistency.
- Original source blanks and negative values are preserved. Low cash is not proof of insolvency. Report scope can include components; workforce FTE does not count physician departures.

## Breckinridge Memorial Hospital

**ID:** KY-LIC-600070; **current CCN:** 181319; **historical CCN:** 181319.

**Address:** 1011 OLD HIGHWAY 60, HARDINSBURG, KY 40143. **County:** Breckinridge.

**Current CMS category:** Critical Access Hospitals; ownership: Government - Local; emergency services: Yes. [CMS](https://data.cms.gov/provider-data/dataset/xubh-q36u)

**Officially listed services:** 24/7 emergency department, acute medical-surgical care, lab, x-ray. [Source](https://www.mybreckhealth.org/bmh)

**County population:** 21,503, July 1, 2025 estimate, V2025. This is not affected population. [Census](https://www.census.gov/quickfacts/fact/table/breckinridgecountykentucky/SBO010222)

### Financial and operating inputs

USD unless a count, days, or FTE field. All values are reported, not inferred.

| CMS field | 2020 cohort | 2021 cohort | 2022 cohort | 2023 cohort |
|---|---:|---:|---:|---:|
| Fiscal period | 2020-01-01 to 2020-12-31 | 2021-01-01 to 2021-12-31 | 2022-01-01 to 2022-12-31 | 2023-01-01 to 2023-12-31 |
| Net Patient Revenue | 18,498,141 | 23,788,999 | 23,924,946 | 27,580,169 |
| Less Total Operating Expense | 21,379,893 | 24,933,640 | 26,579,509 | 26,598,475 |
| Net Income from Service to Patients | -2,881,752 | -1,144,641 | -2,654,563 | 981,694 |
| Cash on Hand and in Banks | 7,439,705 | 6,008,046 | 5,118,181 | 5,636,838 |
| Temporary Investments | Unknown | Unknown | Unknown | Unknown |
| Total Current Assets | 10,749,797 | 10,457,502 | 9,139,942 | 11,529,455 |
| Total Current Liabilities | 7,523,387 | 6,161,568 | 4,433,361 | 4,359,111 |
| Total Liabilities | 13,743,329 | 12,681,976 | 10,567,356 | 10,523,242 |
| Total Assets | 18,375,924 | 19,110,281 | 17,732,471 | 20,867,307 |
| Total Long Term Liabilities | 6,219,942 | 6,520,408 | 6,133,995 | 6,164,131 |
| Total Discharges (V + XVIII + XIX + Unknown) | 485 | 826 | 503 | 944 |
| Total Days (V + XVIII + XIX + Unknown) | 2,582 | 2,698 | 2,349 | 1,793 |
| Total Bed Days Available | 9,150 | 9,125 | 9,125 | 9,125 |
| Net Revenue from Medicaid | 3,626,481 | 3,621,629 | 4,838,402 | 4,236,515 |
| Total Days Title XVIII | 1,840 | 1,570 | 1,502 | 1,027 |
| Total Days Title XIX | 20 | 14 | 9 | 10 |
| FTE - Employees on Payroll | 182.14 | 347.74 | 341.52 | 347.97 |
| Contract Labor: Direct Patient Care | Unknown | Unknown | Unknown | Unknown |
| Total Salaries From Worksheet A | 10,054,115 | 11,016,138 | 11,239,947 | 10,969,200 |
| Cost of Uncompensated Care | 611,258 | 582,801 | 582,243 | 512,675 |

Sources: [2020](https://data.cms.gov/sites/default/files/2025-11/bd432d70-3689-4e8e-a8a5-5e7bf5232cb6/CostReport_2020_Final.csv), [2021](https://data.cms.gov/sites/default/files/2025-11/7e94fd9d-9ef2-4275-b993-299e30f5b371/CostReport_2021_Final.csv), [2022](https://data.cms.gov/sites/default/files/2025-11/c298e529-8bee-401a-bbd8-a38e74e19ab2/CostReport_2022_Final.csv), [2023](https://data.cms.gov/sites/default/files/2026-01/3c39f483-c7e0-4025-8396-4df76942e10f/CostReport_2023_Final.csv). Full original fields are retained in the JSON.

### Kentucky 2025 utilization

| Field | Value | Units |
|---|---:|---|
| licensed CAH beds | 25 | beds |
| acute admissions | 262 | admissions |
| acute inpatient days | 1142 | days |
| acute discharge days | 1142 | days |
| acute ALOS | 4.4 | days |
| swing admissions | 91 | admissions |
| swing inpatient days | 1232 | days |
| swing discharge days | 1232 | days |
| swing ALOS | 13.5 | days |
| total CAH occupancy | 26.0 | percent |

[State report](https://www.chfs.ky.gov/agencies/os/oig/dcn/surveyreports/HospitalFINAL2025.pdf). Table 1A, PDF page 23, printed page 9. Not interchangeable with CMS fiscal-year totals.

## Morgan County ARH Hospital

**ID:** KY-LIC-600058; **current CCN:** 181307; **historical CCN:** 181307.

**Address:** 476 LIBERTY ROAD, WEST LIBERTY, KY 41472. **County:** Morgan.

**Current CMS category:** Critical Access Hospitals; ownership: Voluntary non-profit - Private; emergency services: Yes. [CMS](https://data.cms.gov/provider-data/dataset/xubh-q36u)

**Officially listed services:** cardiology, family medicine, internal medicine, neurology, physical therapy, occupational therapy, speech-language pathology, pulmonology. [Source](https://www.arh.org/search-locations/?city_state_zipv=&distance=&keyword=&location_type=Hospital&search_btn=Submit+Query&sortby=relevance)

**County population:** 14,415, July 1, 2025 estimate, V2025. This is not affected population. [Census](https://www.census.gov/quickfacts/fact/table/morgancountykentucky/PST045225)

### Financial and operating inputs

USD unless a count, days, or FTE field. All values are reported, not inferred.

| CMS field | 2020 cohort | 2021 cohort | 2022 cohort | 2023 cohort |
|---|---:|---:|---:|---:|
| Fiscal period | 2020-07-01 to 2021-06-30 | 2021-07-01 to 2022-06-30 | 2022-07-01 to 2023-06-30 | 2023-07-01 to 2024-06-30 |
| Net Patient Revenue | 16,314,682 | 18,190,262 | 17,035,105 | 19,669,554 |
| Less Total Operating Expense | 15,508,038 | 20,103,388 | 21,000,153 | 21,707,664 |
| Net Income from Service to Patients | 806,644 | -1,913,126 | -3,965,048 | -2,038,110 |
| Cash on Hand and in Banks | 17,835 | 15,398 | 16,871 | 18,207 |
| Temporary Investments | Unknown | Unknown | Unknown | Unknown |
| Total Current Assets | 5,053,040 | 2,162,082 | 2,173,932 | 1,854,222 |
| Total Current Liabilities | 2,210,978 | -2,463,864 | -2,733,890 | -3,051,866 |
| Total Liabilities | 2,501,719 | -2,173,123 | -2,443,149 | -2,761,125 |
| Total Assets | 12,663,024 | 9,740,307 | 9,751,991 | 9,376,605 |
| Total Long Term Liabilities | 290,741 | 290,741 | 290,741 | 290,741 |
| Total Discharges (V + XVIII + XIX + Unknown) | 196 | 201 | 214 | 199 |
| Total Days (V + XVIII + XIX + Unknown) | 1,455 | 1,743 | 1,549 | 1,939 |
| Total Bed Days Available | 9,125 | 9,125 | 9,125 | 9,150 |
| Net Revenue from Medicaid | 4,858,229 | 4,437,529 | 4,953,535 | 4,252,968 |
| Total Days Title XVIII | 575 | 688 | 336 | 501 |
| Total Days Title XIX | 43 | 25 | 26 | 12 |
| FTE - Employees on Payroll | 91.49 | 94.51 | 118 | 94.51 |
| Contract Labor: Direct Patient Care | Unknown | Unknown | Unknown | Unknown |
| Total Salaries From Worksheet A | 6,531,138 | 8,028,969 | 8,753,155 | 8,721,188 |
| Cost of Uncompensated Care | 422,091 | 485,729 | 527,359 | 611,788 |

Sources: [2020](https://data.cms.gov/sites/default/files/2025-11/bd432d70-3689-4e8e-a8a5-5e7bf5232cb6/CostReport_2020_Final.csv), [2021](https://data.cms.gov/sites/default/files/2025-11/7e94fd9d-9ef2-4275-b993-299e30f5b371/CostReport_2021_Final.csv), [2022](https://data.cms.gov/sites/default/files/2025-11/c298e529-8bee-401a-bbd8-a38e74e19ab2/CostReport_2022_Final.csv), [2023](https://data.cms.gov/sites/default/files/2026-01/3c39f483-c7e0-4025-8396-4df76942e10f/CostReport_2023_Final.csv). Full original fields are retained in the JSON.

### Kentucky 2025 utilization

| Field | Value | Units |
|---|---:|---|
| licensed CAH beds | 25 | beds |
| acute admissions | 234 | admissions |
| acute inpatient days | 686 | days |
| acute discharge days | 686 | days |
| acute ALOS | 2.9 | days |
| swing admissions | 106 | admissions |
| swing inpatient days | 1441 | days |
| swing discharge days | 1376 | days |
| swing ALOS | 13.6 | days |
| total CAH occupancy | 23.3 | percent |

[State report](https://www.chfs.ky.gov/agencies/os/oig/dcn/surveyreports/HospitalFINAL2025.pdf). Table 1A, PDF page 23, printed page 9. Not interchangeable with CMS fiscal-year totals.

## Kentucky River Medical Center

**ID:** KY-LIC-100620; **current CCN:** 181334; **historical CCN:** 180139.

**Address:** 540 JETT DRIVE, JACKSON, KY 41339. **County:** Breathitt.

**Current CMS category:** Critical Access Hospitals; ownership: Proprietary; emergency services: Yes. [CMS](https://data.cms.gov/provider-data/dataset/xubh-q36u)

**Officially listed services:** 24-hour emergency department, gynecology, cardiology, intensive care, laboratory, physical therapy, radiology, cardiopulmonary services, occupational therapy, speech therapy, swing beds. [Source](https://kentuckyrivermc.com/kentucky-river-medical-center-recognized-with-2026-best-of-kentucky-regional-award/)

**County population:** 12,558, July 1, 2025 estimate, V2025. This is not affected population. [Census](https://www.census.gov/quickfacts/breathittcountykentucky)

### Financial and operating inputs

USD unless a count, days, or FTE field. All values are reported, not inferred.

| CMS field | 2020 cohort | 2021 cohort | 2022 cohort | 2023 cohort |
|---|---:|---:|---:|---:|
| Fiscal period | 2020-09-01 to 2021-08-31 | 2021-09-01 to 2022-08-31 | 2022-09-01 to 2023-08-31 | 2023-09-01 to 2024-08-31 |
| Net Patient Revenue | 33,104,433 | 34,240,946 | 31,772,045 | 35,283,871 |
| Less Total Operating Expense | 34,034,333 | 33,662,998 | 32,848,861 | 34,542,706 |
| Net Income from Service to Patients | -929,900 | 577,948 | -1,076,816 | 741,165 |
| Cash on Hand and in Banks | -275,448 | -155,304 | -183,998 | -307,635 |
| Temporary Investments | Unknown | Unknown | Unknown | Unknown |
| Total Current Assets | 5,916,918 | 4,642,822 | 5,607,068 | 4,926,615 |
| Total Current Liabilities | 6,089,857 | 8,153,554 | 8,547,707 | 5,183,170 |
| Total Liabilities | 23,074,929 | 8,153,554 | 8,547,707 | 5,183,170 |
| Total Assets | 22,987,249 | 10,752,399 | 10,636,552 | 9,023,004 |
| Total Long Term Liabilities | 16,985,072 | Unknown | Unknown | Unknown |
| Total Discharges (V + XVIII + XIX + Unknown) | 1,761 | 1,507 | 1,522 | 1,506 |
| Total Days (V + XVIII + XIX + Unknown) | 5,824 | 5,283 | 4,586 | 5,142 |
| Total Bed Days Available | 17,885 | 17,885 | 17,885 | 17,934 |
| Net Revenue from Medicaid | 1,006,050 | 13,074,714 | 12,381,979 | 14,978,388 |
| Total Days Title XVIII | 1,869 | 1,507 | 1,195 | 1,198 |
| Total Days Title XIX | 235 | 262 | 293 | 238 |
| FTE - Employees on Payroll | 175.97 | 174.43 | 159.37 | 156.42 |
| Contract Labor: Direct Patient Care | 469,154 | Unknown | Unknown | Unknown |
| Total Salaries From Worksheet A | 10,050,259 | 12,179,695 | 11,806,385 | 13,011,692 |
| Cost of Uncompensated Care | 438,884 | 448,962 | 482,179 | 574,972 |

Sources: [2020](https://data.cms.gov/sites/default/files/2025-11/bd432d70-3689-4e8e-a8a5-5e7bf5232cb6/CostReport_2020_Final.csv), [2021](https://data.cms.gov/sites/default/files/2025-11/7e94fd9d-9ef2-4275-b993-299e30f5b371/CostReport_2021_Final.csv), [2022](https://data.cms.gov/sites/default/files/2025-11/c298e529-8bee-401a-bbd8-a38e74e19ab2/CostReport_2022_Final.csv), [2023](https://data.cms.gov/sites/default/files/2026-01/3c39f483-c7e0-4025-8396-4df76942e10f/CostReport_2023_Final.csv). Full original fields are retained in the JSON.

### Kentucky 2025 utilization

| Field | Value | Units |
|---|---:|---|
| licensed acute beds | 25 | beds |
| beds in operation | 6 | beds |
| admissions | 362 | admissions |
| inpatient days | 1298 | days |
| discharges | 291 | discharges |
| discharge days | 1059 | days |
| average daily census | 4 | patients |
| ALOS | 3.6 | days |
| occupancy | 14.2 | percent |

[State report](https://www.chfs.ky.gov/agencies/os/oig/dcn/surveyreports/HospitalFINAL2025.pdf). Table 1, PDF page 19, printed page 5. Source categorizes here rather than Table 1A despite CAH announcement; retain discrepancy, do not infer closure or reduction.

## Missing data, not zeros

No verified operating margin, doctor-migration signal, acquisition history, bankruptcy/closure/service-reduction outcome labels, detailed organizational ownership/EIN crosswalk, coordinates, or candidate-alternative capacity. County population is supplied; affected population and travel time remain unknown. State and hospital service pages support availability descriptions, not real-time capacity. A source category is not evidence of a hospital-specific event.

Census API extraction returned a missing-key page; population was verified through Census QuickFacts instead. State PDF download/visual screenshot access failed; state values use browser-extracted text with header checks, flagged for visual confirmation.

## Source log

Every source accessed September 11, 2026. Release dates are unknown unless explicitly stated.

| ID | Source | Period | Limitation |
|---|---|---|---|
| CMS_current | [Open](https://data.cms.gov/provider-data/dataset/xubh-q36u) | Current downloaded snapshot; release date unverified | Current facility classification and ownership category; not real-time operating verification. API resource 90fa4cdf-f49d-556d-8790-d32fbbec40c6. |
| KY_directory | [Open](https://www.chfs.ky.gov/agencies/os/oig/dhc/Documents/Hospital%20Directory.pdf) | April 2026 | License IDs are distinct from CCNs. |
| KY_2025 | [Open](https://www.chfs.ky.gov/agencies/os/oig/dcn/surveyreports/HospitalFINAL2025.pdf) | 2025 | Table 1 and Table 1A are different reporting categories. Text extraction checked against headers; visual screenshot verification unavailable. No claim that this resolves classification inconsistency. |
| CAH_definition | [Open](https://www.cms.gov/medicare/health-safety-standards/certification-compliance/critical-access-hospitals) | Current guidance | Rural or treated as rural, not independently established Census/HRSA geography. |
| KR_CAH | [Open](https://kentuckyrivermc.com/kentucky-river-medical-center-achieves-critical-access-hospital-designation-enhancing-healthcare-access-in-breathitt-county/) | Announcement 2025-01-07 | Announcement date is not necessarily effective date. Supports designation transition, not exact historical CCN validity boundaries. |
| POP_21027 | [Open](https://www.census.gov/quickfacts/fact/table/breckinridgecountykentucky/SBO010222) | 2025 V2025 estimate and 2020 Census | County population is not hospital service population or affected population. |
| SERV_600070 | [Open](https://www.mybreckhealth.org/bmh) | Current page; KR article 2026-06-10 | Officially listed services; completeness and real-time capacity not verified. |
| POP_21175 | [Open](https://www.census.gov/quickfacts/fact/table/morgancountykentucky/PST045225) | 2025 V2025 estimate and 2020 Census | County population is not hospital service population or affected population. |
| SERV_600058 | [Open](https://www.arh.org/search-locations/?city_state_zipv=&distance=&keyword=&location_type=Hospital&search_btn=Submit+Query&sortby=relevance) | Current page; KR article 2026-06-10 | Officially listed services; completeness and real-time capacity not verified. |
| POP_21025 | [Open](https://www.census.gov/quickfacts/breathittcountykentucky) | 2025 V2025 estimate and 2020 Census | County population is not hospital service population or affected population. |
| SERV_100620 | [Open](https://kentuckyrivermc.com/kentucky-river-medical-center-recognized-with-2026-best-of-kentucky-regional-award/) | Current page; KR article 2026-06-10 | Officially listed services; completeness and real-time capacity not verified. |
| CMS_2021 | [Open](https://data.cms.gov/sites/default/files/2025-11/7e94fd9d-9ef2-4275-b993-299e30f5b371/CostReport_2021_Final.csv) | 2021 file cohort; each row has actual fiscal dates | Revised historical cost-report data; original public availability unknown. Figures describe reporting entity/complex, not verified consolidated parent finances. Blank fields remain null. No current-risk inference. |
| CMS_2020 | [Open](https://data.cms.gov/sites/default/files/2025-11/bd432d70-3689-4e8e-a8a5-5e7bf5232cb6/CostReport_2020_Final.csv) | 2020 file cohort; each row has actual fiscal dates | Revised historical cost-report data; original public availability unknown. Figures describe reporting entity/complex, not verified consolidated parent finances. Blank fields remain null. No current-risk inference. |
| CMS_2022 | [Open](https://data.cms.gov/sites/default/files/2025-11/c298e529-8bee-401a-bbd8-a38e74e19ab2/CostReport_2022_Final.csv) | 2022 file cohort; each row has actual fiscal dates | Revised historical cost-report data; original public availability unknown. Figures describe reporting entity/complex, not verified consolidated parent finances. Blank fields remain null. No current-risk inference. |
| CMS_2023 | [Open](https://data.cms.gov/sites/default/files/2026-01/3c39f483-c7e0-4025-8396-4df76942e10f/CostReport_2023_Final.csv) | 2023 file cohort; each row has actual fiscal dates | Revised historical cost-report data; original public availability unknown. Figures describe reporting entity/complex, not verified consolidated parent finances. Blank fields remain null. No current-risk inference. |

## Engineering handoff

Use stable project ID plus report record ID and actual fiscal dates. Do not join on name alone or replace historical CCNs with current ones. Preserve 2020–2023 file-cohort labels separately from fiscal-end years. All financial values retain source column names; dictionary: https://data.cms.gov/sites/default/files/2024-03/9756088d-5280-4090-80b9-449d31ef25a3/Cost%20Report%20Data%20Dictionary%20Update.pdf . Treat revised historical releases as unavailable for point-in-time validation until actual original publication evidence is found. No six-to-twelve-month prediction capability is established.
