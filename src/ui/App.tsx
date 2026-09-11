import { useCallback, useMemo, useState } from "react";
import evidencePack from "../../research/PulseLine_expanded_evidence_v1.json";
import researchPack from "../../research/PulseLine_three_hospital_data.json";
import { adaptEvidencePack, eventsForHospital, observationsForHospital } from "../../lib/adapt-evidence.ts";
import { loadResearchDashboard } from "../../lib/pipeline.ts";
import { scoringConfig } from "../../lib/scoring-config.ts";
import { EventTimeline } from "./EventTimeline.tsx";
import { HospitalDrawer } from "./HospitalDrawer.tsx";
import { ResearchCaseDrawer } from "./ResearchCaseDrawer.tsx";
import { fiscalLabel, money, statusClass } from "./format.ts";

export function App() {
  const loaded = useMemo(() => loadResearchDashboard(researchPack), []);
  const evidence = useMemo(() => adaptEvidencePack(evidencePack), []);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedResearchId, setSelectedResearchId] = useState<string | null>(null);

  const selectedFacility = loaded.facilities.find((facility) => facility.hospitalId === selectedHospitalId) ?? null;
  const selected =
    selectedFacility?.reports.find((report) => report.hospital.id === selectedReportId) ??
    selectedFacility?.latest ??
    null;
  const researchCases = evidence.ledger?.hospitals.filter((hospital) => hospital.financialCoverage === "pending") ?? [];
  const selectedResearch = researchCases.find((hospital) => hospital.hospitalId === selectedResearchId) ?? null;

  const closeFacility = useCallback(() => {
    setSelectedHospitalId(null);
    setSelectedReportId(null);
  }, []);
  const closeResearch = useCallback(() => {
    setSelectedResearchId(null);
  }, []);

  return (
    <div className="page">
      <header className="hero">
        <p className="brand-kicker">Kentucky · Rural / safety-net</p>
        <h1>PulseLine</h1>
        <p className="tagline">Early Warning Intelligence for Rural Healthcare</p>
        <p className="lede">
          A historical financial prototype using 12 researched CMS cost reports for Breckinridge Memorial, Morgan County
          ARH, and Kentucky River, plus a separate sourced structural-event timeline. It does not detect workforce
          instability and is not a validated early-warning or bankruptcy model. Five-domain research and matched
          controls remain pending.
        </p>
      </header>

      {!loaded.ok ? (
        <section className="extract-error" role="alert">
          <h2>Dashboard extract failed validation</h2>
          <p>The hospital radar is not shown because the extract is invalid. Nothing was scored.</p>
          <ul>
            {loaded.errors.map((error) => (
              <li key={`${error.code}-${error.path}`}>
                [{error.code}] {error.path}: {error.message}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <>
          <section className="radar">
            <div className="section-head">
              <h2>Kentucky hospital radar</h2>
              <p>
                Latest fiscal CMS report for each facility. {loaded.views.length} hospital-year reports across{" "}
                {loaded.facilities.length} hospitals. Source verification is {loaded.sourceVerification}.
              </p>
            </div>
            <div className="card-grid">
              {loaded.facilities.map((facility) => {
                const view = facility.latest;
                return (
                  <button
                    type="button"
                    key={facility.hospitalId}
                    className={`hospital-card ${statusClass(view.financial.status)}`}
                    onClick={() => {
                      setSelectedResearchId(null);
                      setSelectedHospitalId(facility.hospitalId);
                      setSelectedReportId(view.hospital.id);
                    }}
                  >
                    <div className="card-top">
                      <h3>{facility.name}</h3>
                      <span className={`status-pill ${statusClass(view.financial.status)}`}>
                        {scoringConfig.statusLabels[view.financial.status].toUpperCase()}
                      </span>
                    </div>
                    <p className="muted">
                      {view.hospital.city}
                      {view.hospital.county ? `, ${view.hospital.county} County` : ""} · reported CCN{" "}
                      {view.hospital.ccnAsReported}
                    </p>
                    <div className="card-score">
                      <span className="label">Financial stress</span>
                      <strong>{view.financial.score === null ? "—" : view.financial.score}</strong>
                    </div>
                    <p className="tiny">
                      Latest fiscal period: {fiscalLabel(view.hospital.fiscalYearStart, view.hospital.fiscalYearEnd)}
                    </p>
                    <p className="tiny">
                      Data coverage: {view.financial.dataCoverage}
                      {view.hospital.dataQuality.identityStatus === "unresolved"
                        ? " · Identity verification required"
                        : ""}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="snapshot">
            <h2>Hospital pressure from CMS fiscal reports</h2>
            <div className="snapshot-grid">
              {loaded.facilities.map((facility) => {
                const view = facility.latest;
                return (
                  <article key={`${facility.hospitalId}-snap`}>
                    <h3>{facility.name}</h3>
                    <p>Net Patient Revenue {money(view.hospital.financials.netPatientRevenue)}</p>
                    <p>Less Total Operating Expense {money(view.hospital.financials.operatingExpenses)}</p>
                    <p>Cash on Hand and in Banks {money(view.hospital.financials.cash)}</p>
                    <p className="tiny">Kentucky 2025 utilization is not mixed into these fiscal-year figures.</p>
                  </article>
                );
              })}
            </div>
          </section>
        </>
      )}

      <section className="radar">
        <div className="section-head">
          <h2>Research cohort · financial coverage pending</h2>
          <p>
            Highlands and Paul B. Hall are a separate evidence cohort. CCNs, license IDs, financials, and scores were
            not invented.
          </p>
        </div>
        {!evidence.ok ? (
          <div className="extract-error" role="alert">
            <p>Evidence ledger failed validation. The timeline is not shown.</p>
            <ul>
              {evidence.errors.map((error) => (
                <li key={`${error.code}-${error.path}`}>
                  [{error.code}] {error.path}: {error.message}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="card-grid">
            {researchCases.map((hospital) => (
              <button
                type="button"
                key={hospital.hospitalId}
                className="hospital-card status-insufficient"
                onClick={() => {
                  setSelectedHospitalId(null);
                  setSelectedReportId(null);
                  setSelectedResearchId(hospital.hospitalId);
                }}
              >
                <div className="card-top">
                  <h3>{hospital.name}</h3>
                  <span className="status-pill status-pending">FINANCIAL DATA PENDING</span>
                </div>
                <p className="muted">{hospital.city} · {hospital.hospitalId}</p>
                <p className="tiny">No score assigned · CCN at event unknown · provider CHOW {hospital.providerChow}</p>
                <p className="tiny">Identity {hospital.identityStatus.replaceAll("_", " ")}</p>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="snapshot">
        <h2>Sourced structural-event timeline</h2>
        <p className="muted">
          Separate from the financial score. Acquisition and rename share one event group. Kentucky River property sale
          is not a provider CHOW. Quorum parent events are not a verified facility bankruptcy.
        </p>
        {evidence.ok && evidence.ledger ? (
          <EventTimeline
            events={evidence.ledger.events}
            emptyLabel="No structural events were validated from the evidence ledger."
          />
        ) : (
          <p className="muted small">Timeline withheld because the evidence ledger is invalid.</p>
        )}
      </section>

      <section className="methodology" id="methodology">
        <h2>Methodology &amp; limitations</h2>
        <ul>
          <li>CMS cost reports are historical financial observations, not forecasts.</li>
          <li>PulseLine scores the latest fiscal report per hospital and keeps earlier reports inspectable.</li>
          <li>
            Patient-service expense pressure uses Less Total Operating Expense / Net Patient Revenue. Overall operating
            margin is not calculated.
          </li>
          <li>Negative cash and negative liabilities are preserved and uninterpretable ratios are excluded.</li>
          <li>Hospital pressure and community context are shown separately. No new weighted convergence score was added.</li>
          <li>A null publication date is not historical eligibility.</li>
          <li>Acquisition, bankruptcy, closure, and service-reduction outcomes stay unknown unless a sourced event says otherwise.</li>
          <li>Workforce / NPPES, five-domain profiles, pre-event panels, and matched controls remain pending.</li>
          {loaded.missingEvidence.map((item) => (
            <li key={item}>{item}</li>
          ))}
          {evidence.ledger
            ? Object.entries(evidence.ledger.domainCoverage).map(([domain, note]) => (
                <li key={domain}>
                  {domain} coverage: {note}
                </li>
              ))
            : null}
        </ul>
      </section>

      {selected && selectedFacility ? (
        <HospitalDrawer
          view={selected}
          reports={selectedFacility.reports}
          events={eventsForHospital(evidence.ledger, selectedFacility.hospitalId)}
          observations={observationsForHospital(evidence.ledger, selectedFacility.hospitalId)}
          onSelectReport={setSelectedReportId}
          onClose={closeFacility}
        />
      ) : null}

      {selectedResearch ? (
        <ResearchCaseDrawer
          hospital={selectedResearch}
          events={eventsForHospital(evidence.ledger, selectedResearch.hospitalId)}
          observations={observationsForHospital(evidence.ledger, selectedResearch.hospitalId)}
          onClose={closeResearch}
        />
      ) : null}
    </div>
  );
}
