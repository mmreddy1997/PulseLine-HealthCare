# PulseLine

Early Warning Intelligence for Rural Healthcare.

PulseLine monitors Kentucky hospital and service-line distress so operators can see strain before it becomes a crisis. It is an exploratory decision-support project for county and state healthcare leadership. It is **not** a validated bankruptcy, closure, or 6–12-month prediction model. Financial distress, service reductions, closure, conversion, acquisition, and bankruptcy are separate outcomes.

## What exists now

This increment is a local **data-validation foundation** only:

- TypeScript contracts for hospital identity (including a six-digit CMS CCN stored as a string), cost-report observations, provenance, missing-data notes, and identity discrepancies.
- A validator that accepts unknown JSON, returns structured errors and warnings, and rejects invalid input without silently repairing it.
- Small, clearly fictional simulated fixtures under `tests/fixtures`. They are not CMS observations.
- A CLI that validates a JSON file and exits unsuccessfully when validation fails.
- Automated tests and a typecheck script.

The dashboard, maps, authentication, live NPPES lookup, invented financial metrics, and risk scoring are **not implemented**.

Research extracts are now available under `research/`. They preserve original source fields and uncertainty notes; they have not yet been adapted to or validated against the application schema.

## Setup

Requires Node.js 20 or later.

```bash
npm install
```

## Commands

```bash
npm test
npm run typecheck
npm run validate -- tests/fixtures/simulated-cost-reports.json
```

`npm run validate -- <file.json>` prints errors and warnings. It exits with a non-zero status when validation fails.

## Validation rules

- Required hospital and fiscal-period fields must be present.
- CMS CCN must be a six-digit **string** so leading zeroes are preserved. Numbers are rejected, not coerced.
- Records must be in Kentucky (`KY` or `Kentucky`).
- Fiscal dates must be real calendar dates in `YYYY-MM-DD` form, and start must be on or before end.
- Null source values stay null. Missing financial values are never treated as zero.
- Unresolved identity review is a warning, not an automatic reject.
- A provider address change is an identity discrepancy only. It does not prove a physician departure.

## Limitations

- No verified CMS data has been imported.
- Fixtures under `tests/fixtures` are simulated and unmistakably fictional.
- This is not a bankruptcy or closure predictor.
- Invalid input is rejected as-is; the validator does not pad CCNs, swap dates, or fill missing money fields.

## Next step

Import verified CMS research data (when those source files are available) through an adapter that preserves raw extracts. Do not invent their contents here.

## Research evidence

Three Kentucky hospitals, 12 historical cost reports across the 2020–2023 file cohorts, and explicit source and missing-data notes. Event verification and historical model validation remain incomplete.

- [PulseLine_three_hospital_evidence.md](research/PulseLine_three_hospital_evidence.md)
- [PulseLine_three_hospital_data.json](research/PulseLine_three_hospital_data.json)
- [PulseLine_event_log.json](research/PulseLine_event_log.json)
- [PulseLine_data_dictionary.md](research/PulseLine_data_dictionary.md)

Kentucky River’s historical and current CCNs differ. Consult the identity notes before joining records. No unsupported risk scores or personal clinician histories are included.
