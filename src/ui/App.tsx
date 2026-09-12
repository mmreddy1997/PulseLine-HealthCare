import { useCallback, useMemo, useState } from "react";
import evidencePack from "../../research/PulseLine_expanded_evidence_v1.json";
import researchPack from "../../research/PulseLine_three_hospital_data.json";
import { adaptEvidencePack, eventsForHospital, observationsForHospital } from "../../lib/adapt-evidence.ts";
import { researchAskContext, scoredAskContext, type PulseAnswer } from "../../lib/ask/index.ts";
import { loadResearchDashboard } from "../../lib/pipeline.ts";
import { scoringConfig } from "../../lib/scoring-config.ts";
import { EventTimeline } from "./EventTimeline.tsx";
import { HospitalWorkspace } from "./HospitalWorkspace.tsx";
import { SiteHeader } from "./SiteHeader.tsx";
import { StatusGlyph } from "./hospital-display.tsx";
import { money, shortFiscalRange, statusClass } from "./format.ts";

export function App() {
  const loaded = useMemo(() => loadResearchDashboard(researchPack), []);
  const evidence = useMemo(() => adaptEvidencePack(evidencePack), []);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedResearchId, setSelectedResearchId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Record<string, PulseAnswer[]>>({});
  const [selectedByHospital, setSelectedByHospital] = useState<Record<string, string[]>>({});

  const selectedFacility = loaded.facilities.find((facility) => facility.hospitalId === selectedHospitalId) ?? null;
  const selected =
    selectedFacility?.reports.find((report) => report.hospital.id === selectedReportId) ??
    selectedFacility?.latest ??
    null;
  const researchCases = evidence.ledger?.hospitals.filter((hospital) => hospital.financialCoverage === "pending") ?? [];
  const selectedResearch = researchCases.find((hospital) => hospital.hospitalId === selectedResearchId) ?? null;
  const otherNames = [
    ...loaded.facilities.map((facility) => facility.name),
    ...researchCases.map((hospital) => hospital.name),
  ];

  const closeFacility = useCallback(() => {
    setSelectedHospitalId(null);
    setSelectedReportId(null);
  }, []);
  const closeResearch = useCallback(() => {
    setSelectedResearchId(null);
  }, []);

  return (
    <div className="page">
      <SiteHeader />
      <header className="hero">
        <p className="brand-kicker">Kentucky / Historical hospital evidence</p>
        <h1>Understand financial pressure at rural Kentucky hospitals.</h1>
        <p className="lede">
          Explore historical financial reports, documented events, and the evidence behind them. Select a hospital to
          compare reporting years, ask questions about available data, and download sourced answers.
        </p>
        <p className="lede">
          PulseLine is for county and state healthcare leaders, rural-health researchers, and community planners. It
          helps investigate what public reports already show. It does not predict bankruptcy, closure, acquisition, or
          service reduction.
        </p>
      </header>

      <section className="howto" id="about" aria-labelledby="howto-title">
        <h2 id="howto-title">How to use PulseLine</h2>
        <ol className="howto-steps">
          <li>
            <strong>Choose a hospital.</strong> Scored hospitals have CMS reports. Research cases have documented events
            only.
          </li>
          <li>
            <strong>Explore reports and explanations.</strong> Compare reporting years and check what is missing.
          </li>
          <li>
            <strong>Ask about the available evidence.</strong> Use suggested questions or type your own.
          </li>
          <li>
            <strong>Download selected answers.</strong> Exports include only the sourced answers you choose.
          </li>
        </ol>
        <p className="muted">
          Figures are historical and experimental. They are not live hospital conditions or a comprehensive current
          dataset.
        </p>
        <p className="mission">Because we believe your ZIP code should not determine the quality of care you receive.</p>
      </section>

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
        <section className="radar" id="hospitals">
          <div className="section-head">
            <h2>Scored hospitals</h2>
            <p>
              Latest fiscal CMS report for each facility. {loaded.views.length} hospital-year reports across{" "}
              {loaded.facilities.length} hospitals.
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
                    <div>
                      <h3>{facility.name}</h3>
                      <p className="muted">
                        {view.hospital.city}
                        {view.hospital.county ? `, ${view.hospital.county} County` : ""}
                      </p>
                    </div>
                    <span className={`status-pill ${statusClass(view.financial.status)}`}>
                      <StatusGlyph status={view.financial.status} />
                      {view.financial.score !== null ? `${view.financial.score} · ` : ""}
                      {scoringConfig.statusLabels[view.financial.status]}
                    </span>
                  </div>
                  <p className="tiny">
                    {shortFiscalRange(view.hospital.fiscalYearStart, view.hospital.fiscalYearEnd)} · Coverage{" "}
                    {view.financial.dataCoverage}
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {loaded.ok ? (
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
      ) : null}

      <section className="radar">
        <div className="section-head">
          <h2>Research cases · financial data pending</h2>
          <p>Highlands and Paul B. Hall are a separate evidence cohort. Financials and scores were not invented.</p>
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
                  <div>
                    <h3>{hospital.name}</h3>
                    <p className="muted">{hospital.city}</p>
                  </div>
                  <span className="status-pill status-pending">
                    <StatusGlyph status="pending" />
                    Financial data pending
                  </span>
                </div>
                <p className="tiny">No score assigned · documented events only</p>
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
        <h2>Methodology &amp; limits</h2>
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
          <li>
            PulseLine Ask retrieves facts in the browser. An optional on-device model may only explain approved results.
            Questions are not sent to a remote inference service.
          </li>
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
        <HospitalWorkspace
          title={selectedFacility.name}
          subtitle={`${selected.hospital.city}, ${selected.hospital.state}`}
          pending={false}
          view={selected}
          reports={selectedFacility.reports}
          events={eventsForHospital(evidence.ledger, selectedFacility.hospitalId)}
          observations={observationsForHospital(evidence.ledger, selectedFacility.hospitalId)}
          research={null}
          askContext={scoredAskContext(selectedFacility, selected.hospital.id, evidence.ledger, otherNames)}
          answers={conversations[selectedFacility.hospitalId] ?? []}
          selectedIds={selectedByHospital[selectedFacility.hospitalId] ?? []}
          onAnswers={(next) => setConversations((current) => ({ ...current, [selectedFacility.hospitalId]: next }))}
          onSelectedIds={(next) => setSelectedByHospital((current) => ({ ...current, [selectedFacility.hospitalId]: next }))}
          onClearConversation={() => {
            setConversations((current) => ({ ...current, [selectedFacility.hospitalId]: [] }));
            setSelectedByHospital((current) => ({ ...current, [selectedFacility.hospitalId]: [] }));
          }}
          onSelectReport={setSelectedReportId}
          onClose={closeFacility}
        />
      ) : null}

      {selectedResearch ? (
        <HospitalWorkspace
          title={selectedResearch.name}
          subtitle={selectedResearch.city}
          pending
          view={null}
          reports={[]}
          events={eventsForHospital(evidence.ledger, selectedResearch.hospitalId)}
          observations={observationsForHospital(evidence.ledger, selectedResearch.hospitalId)}
          research={selectedResearch}
          askContext={researchAskContext(selectedResearch, evidence.ledger, otherNames)}
          answers={conversations[selectedResearch.hospitalId] ?? []}
          selectedIds={selectedByHospital[selectedResearch.hospitalId] ?? []}
          onAnswers={(next) => setConversations((current) => ({ ...current, [selectedResearch.hospitalId]: next }))}
          onSelectedIds={(next) => setSelectedByHospital((current) => ({ ...current, [selectedResearch.hospitalId]: next }))}
          onClearConversation={() => {
            setConversations((current) => ({ ...current, [selectedResearch.hospitalId]: [] }));
            setSelectedByHospital((current) => ({ ...current, [selectedResearch.hospitalId]: [] }));
          }}
          onSelectReport={() => undefined}
          onClose={closeResearch}
        />
      ) : null}
    </div>
  );
}
