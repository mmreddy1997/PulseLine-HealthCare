# PulseLine data dictionary and completion audit

Access/check date: September 11, 2026. Applies to PulseLine_three_hospital_data.json and PulseLine_event_log.json.

## Structure and provenance

| Object / field | Meaning and proposed use | Scope / limitations |
|---|---|---|
| hospitals | Three facility identity records | Current identity; not a validated historical enrollment timeline |
| hospital_id | Stable project key based on Kentucky license number, stored as text | Not a CMS CCN or NPI |
| current_ccn | Current CMS facility identifier, text | Snapshot; exact validity dates not established |
| historical_cost_report_ccn | CCN on downloaded financial reports | Kentucky River differs from its current CCN; transition flagged |
| rural_classification | CAH: rural or treated as rural under CMS criteria | Not independent Census/HRSA geographic rural classification; do not backfill current status to earlier years |
| hospital_year_reports | 12 cost reports from 2020–2023 file cohorts | Reporting hospital/complex; parent consolidation not independently verified |
| file_cohort | Year in CMS download filename | Not necessarily the calendar year of fiscal end |
| fiscal_start / fiscal_end | Actual beginning/end of report, ISO date | Use these dates for comparisons |
| period_days | Inclusive calendar days between fiscal dates | Calculated metadata, not a reported CMS figure |
| report_record_id | CMS report record number | Distinguishes source reports; not a hospital identity |
| original_cms_fields | Unmodified field names and nonblank source strings | Empty source cells become JSON null; original zero and negative strings remain |
| source_id | Reference to sources object | Every financial field inherits its parent report's source and period |
| sources.url | Exact source URL | Access date does not establish historical availability |
| sources.publication_date | Verified publication date if available | Null means unverified; folder date is not proof |
| sources.sha256 | Checksum of downloaded annual file | Supports reproducibility |
| observations | County population, listed services, state utilization | Each record specifies units, period, source and limitations |
| events / context_events | Verified contextual announcement | Current entry is CAH designation announcement, not a distress event |
| outcome_log | Verified acquisition/bankruptcy/closure/service-reduction events | Currently empty because investigation is incomplete, not because no events occurred |
| hospital_outcome_status | Explicit unverified outcome state for every hospital and outcome | Never use null as a negative training label |

Master name/address/CCN/ownership/ED fields use CMS_current; license and county identity also use KY_directory. Service fields use service_source. Rural classification uses rural_sources. Financial fields inherit hospital/reporting-complex scope from their parent report. County population observations have county scope; listed services/state utilization have facility scope. All sources carry the access date. Snapshot periods and unknown release dates are explicitly identified.

## Financial field families

The full worksheet-level definitions are in the [CMS Hospital Provider Cost Report dictionary](https://data.cms.gov/sites/default/files/2024-03/9756088d-5280-4090-80b9-449d31ef25a3/Cost%20Report%20Data%20Dictionary%20Update.pdf), accessed September 11, 2026. Check version compatibility before implementing a ratio.

| Family | Fields / units | Proposed use and caution |
|---|---|---|
| Patient-care financial results | Net Patient Revenue; Less Total Operating Expense; Net Income from Service to Patients — USD | Historical trends; patient-care result is not automatically a validated overall operating margin |
| Liquidity | Cash on Hand and in Banks; Temporary Investments; Total Current Assets; Total Current Liabilities — USD | Liquidity investigation; system cash pooling and restrictions are unverified |
| Liabilities | Total Liabilities; Total Long Term Liabilities; Total Assets — USD | Balance-sheet context; liabilities are not synonymous with borrowing |
| Volume | Discharges — discharges; inpatient days and available bed-days — days | Compare compatible components and period lengths; do not combine acute and swing-bed categories silently |
| Payer exposure | Net Revenue from Medicaid — USD; Title XVIII/XIX days — days | Medicare/Medicaid utilization context; patient days do not establish revenue shares |
| Workforce | FTE - Employees on Payroll — FTE; contract labor and salaries — USD | Aggregate staffing/cost inputs; not physician counts or confirmed migration |
| Uncompensated care | Cost of Uncompensated Care — USD | Reported burden; not a measure of hospital insolvency |

## Completion audit

- Free/public sources only: followed. Downloaded CMS files and accessed Kentucky, Census and official hospital pages. No paid source or trial used.
- Identity: current CMS identities verified; Kentucky River historical transition dates unresolved. Rural classification uses explicit CAH definition.
- Financial dataset: collected 12 reports; original source fields preserved. Scope reconciliation and point-in-time release verification remain open.
- Event log: separate file created with unknown outcome states. Systematic event investigation is outstanding.
- Source log: included in evidence Markdown and JSON. Unknown publication dates preserved as null.
- Dictionary: local schema and factor definitions supplied here; detailed CMS worksheet definitions linked above.
- Privacy: no patient records or identifiable clinician histories collected. Any proposed identifiable clinician analysis requires revisiting the user's scope first.
- Real/mock separation: no mock values, risk scores or unsupported distress labels added. The only derived field is report length in days.
- Historical testing: not performed. The revised files cannot be claimed to have been available before an event without release evidence.
- Workforce-vs-financial baseline comparison: not performed; engineering/model-validation work still required.

Next bounded research task: verify the four outcome categories for these three hospitals with dated evidence. Keep announcement dates separate from effective dates, and retain unknown labels where evidence is insufficient.
