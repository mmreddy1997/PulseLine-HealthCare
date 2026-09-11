import { useEffect, useRef } from "react";
import { parseCmsNumeric } from "../../lib/adapt-research.ts";
import { investigationNextSteps } from "../../lib/investigate.ts";
import { flaggedExplanations } from "../../lib/score-financial.ts";
import { scoringConfig } from "../../lib/scoring-config.ts";
import type { EvidenceObservation, Hospital, HospitalView, ScoreFactor, StructuralEvent } from "../types.ts";
import { ContextObservations, EventTimeline } from "./EventTimeline.tsx";
import { cycleFocus } from "./focus.ts";
import { fiscalLabel, percent, ratio, statusClass } from "./format.ts";

function patientServiceResultNote(hospital: Hospital): string {
  const income = parseCmsNumeric(hospital.sourceFields["Net Income from Service to Patients"], "income");
  const npr = hospital.financials.netPatientRevenue;
  if (income.error || income.value === null || npr === null) {
    return "Not calculated from this report.";
  }
  if (npr === 0) {
    return "Excluded: Net Patient Revenue is zero, so the patient-service result is not interpretable.";
  }
  return `${percent(income.value / npr)} = Net Income from Service to Patients / Net Patient Revenue. Historical patient-care result, not a validated overall operating margin.`;
}

function factorDisplay(factor: ScoreFactor): string {
  if (factor.availability === "unavailable") return "Not available in current dataset";
  if (factor.availability === "invalid") return "Invalid in current dataset";
  if (factor.availability === "unsupported") return "Unsupported calculation";
  if (factor.rawValue === null) return "Not available in current dataset";
  if (factor.id === "operating_margin" || factor.id === "patient_volume") return percent(factor.rawValue);
  return ratio(factor.rawValue);
}

function ScoreMeter({
  score,
  status,
}: {
  score: number | null;
  status: HospitalView["financial"]["status"];
}) {
  return (
    <div className={`score-meter ${statusClass(status)}`}>
      <div className="score-meter-value">{score === null ? "—" : score}</div>
      <div className="score-meter-scale">{score === null ? "no score" : "/ 100"}</div>
      <div className="score-meter-bar" aria-hidden="true">
        <span style={{ width: `${score ?? 0}%` }} />
      </div>
    </div>
  );
}

export function HospitalDrawer({
  view,
  reports,
  events,
  observations,
  onSelectReport,
  onClose,
}: {
  view: HospitalView;
  reports: HospitalView[];
  events: StructuralEvent[];
  observations: EvidenceObservation[];
  onSelectReport: (id: string) => void;
  onClose: () => void;
}) {
  const { hospital, financial, workforce, pulse } = view;
  const explanations = flaggedExplanations(financial);
  const nextSteps = investigationNextSteps(view);
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const activeReportRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const openedHospitalRef = useRef<string | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    openedHospitalRef.current = view.hospital.hospitalId;
    const panel = panelRef.current;
    if (!panel) return undefined;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key === "Tab" && panel) {
        cycleFocus(panel, event);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [view.hospital.hospitalId]);

  useEffect(() => {
    if (openedHospitalRef.current !== view.hospital.hospitalId) return;
    const panel = panelRef.current;
    if (!panel) return;
    if (panel.contains(document.activeElement)) return;
    activeReportRef.current?.focus();
  }, [view.hospital.id, view.hospital.hospitalId]);

  return (
    <div className="drawer-layer">
      <div className="drawer-backdrop" onClick={onClose} />
      <aside
        ref={panelRef}
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <header className="drawer-header">
          <p className="eyebrow">Hospital deep dive</p>
          <h2 id="drawer-title">{hospital.name}</h2>
          <p className="muted">
            {hospital.city}, {hospital.state}
            {hospital.county ? ` · ${hospital.county} County` : ""} · hospital_id {hospital.hospitalId}
          </p>
          <p className="tiny">
            Reported CCN {hospital.ccnAsReported ?? hospital.ccn}
            {hospital.historicalCcn ? ` · historical CCN ${hospital.historicalCcn}` : ""}
            {hospital.currentCcn ? ` · current CCN ${hospital.currentCcn}` : ""}
          </p>
          <button type="button" className="close-btn" ref={closeRef} onClick={onClose}>
            Close
          </button>
        </header>

        <section>
          <h3>Fiscal reports</h3>
          <div className="report-switcher">
            {reports.map((report) => (
              <button
                type="button"
                key={report.hospital.id}
                ref={report.hospital.id === hospital.id ? activeReportRef : undefined}
                className={report.hospital.id === hospital.id ? "report-btn active" : "report-btn"}
                onClick={() => onSelectReport(report.hospital.id)}
              >
                {fiscalLabel(report.hospital.fiscalYearStart, report.hospital.fiscalYearEnd)}
                {report.hospital.fileCohort ? ` · cohort ${report.hospital.fileCohort}` : ""}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3>PulseLine overview</h3>
          <div className="overview-grid">
            <div>
              <span className="label">Financial stress</span>
              <ScoreMeter score={financial.score} status={financial.status} />
            </div>
            <div>
              <span className="label">Status</span>
              <p className={`status-pill ${statusClass(financial.status)}`}>
                {scoringConfig.statusLabels[financial.status]}
              </p>
              <span className="label">Data coverage</span>
              <p>{financial.dataCoverage}</p>
            </div>
          </div>
          <p className="muted small">{financial.reconstruction.coverageNote}</p>
        </section>

        <section>
          <h3>Financial signals</h3>
          <ul className="signal-list">
            {financial.factors.map((factor) => (
              <li key={factor.id}>
                <div className="signal-head">
                  <strong>{factor.metric}</strong>
                  <span>{factorDisplay(factor)}</span>
                </div>
                <p className="muted small">{factor.reason}</p>
              </li>
            ))}
          </ul>
          <p className="muted small">
            Derived patient-service result: {patientServiceResultNote(hospital)}
          </p>
        </section>

        <section>
          <h3>Score reconstruction</h3>
          <dl className="meta-list">
            <div>
              <dt>Available factors</dt>
              <dd>
                {financial.reconstruction.availableFactorIds.length
                  ? financial.reconstruction.availableFactorIds.join(", ")
                  : "None"}
              </dd>
            </div>
            <div>
              <dt>Weight sum</dt>
              <dd>{financial.reconstruction.weightSum || "n/a"}</dd>
            </div>
            <div>
              <dt>Unrounded score</dt>
              <dd>
                {financial.reconstruction.unroundedScore === null
                  ? "null"
                  : financial.reconstruction.unroundedScore.toFixed(4)}
              </dd>
            </div>
            <div>
              <dt>Rounded score</dt>
              <dd>
                {financial.reconstruction.roundedScore === null ? "null" : financial.reconstruction.roundedScore}
              </dd>
            </div>
          </dl>
          <p className="muted small">{financial.reconstruction.rounding}</p>
          <p className="muted small">{financial.reconstruction.coverageNote}</p>
        </section>

        <section>
          <h3>Why is this hospital flagged?</h3>
          <ul className="reason-list">
            {explanations.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <p className="muted small">
            Explanations are generated from shared scoring configuration, not from a language model.
            {financial.reconstruction.rounding}
          </p>
        </section>

        <section>
          <h3>Structural events</h3>
          <p className="muted small">
            Sourced timeline, separate from the financial score. A null publication date is not historical eligibility.
          </p>
          <EventTimeline
            events={events}
            emptyLabel="No verified structural events are attached to this hospital in the current evidence ledger."
          />
        </section>

        <ContextObservations
          observations={observations}
          domain="operational"
          title="Hospital pressure context"
        />
        <ContextObservations observations={observations} domain="community" title="Community context" />
        <ContextObservations
          observations={observations}
          domain="workforce_access"
          title="County access context"
        />

        <section>
          <h3>What to investigate next</h3>
          <ul className="reason-list">
            {nextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </section>

        <section>
          <h3>Workforce signal</h3>
          <p className="status-pill status-pending">Pending / experimental</p>
          <p>{workforce.summary}</p>
          <p className="muted small">{workforce.explanation}</p>
        </section>

        <section>
          <h3>PulseLine signal</h3>
          <p className={`status-pill ${pulse.triggered ? "status-high" : "status-pending"}`}>
            {pulse.severity === "insufficient_evidence"
              ? "Insufficient evidence for multi-signal deterioration"
              : "Combined signal not triggered"}
          </p>
          {pulse.reasons.map((reason) => (
            <p key={reason}>{reason}</p>
          ))}
        </section>

        <section>
          <h3>Data quality</h3>
          <dl className="meta-list">
            <div>
              <dt>Source</dt>
              <dd>
                {hospital.sourceUrl ? (
                  <a href={hospital.sourceUrl} target="_blank" rel="noreferrer">
                    {hospital.sourceId ?? "CMS cost report"}
                  </a>
                ) : (
                  hospital.dataQuality.source
                )}
              </dd>
            </div>
            <div>
              <dt>Report ID</dt>
              <dd>{hospital.reportRecordId ?? "Unknown"}</dd>
            </div>
            <div>
              <dt>File cohort</dt>
              <dd>{hospital.fileCohort ?? "Unknown"}</dd>
            </div>
            <div>
              <dt>Source verification</dt>
              <dd>{hospital.dataQuality.sourceVerification}</dd>
            </div>
            <div>
              <dt>Fiscal dates</dt>
              <dd>{fiscalLabel(hospital.fiscalYearStart, hospital.fiscalYearEnd)}</dd>
            </div>
            <div>
              <dt>Outcomes</dt>
              <dd>{hospital.outcomeStatus}</dd>
            </div>
            <div>
              <dt>Identity status</dt>
              <dd>
                {hospital.dataQuality.identityStatus === "unresolved"
                  ? "Identity verification required"
                  : hospital.dataQuality.identityStatus}
              </dd>
            </div>
            <div>
              <dt>Missing metrics</dt>
              <dd>
                {hospital.dataQuality.missingFields.length
                  ? hospital.dataQuality.missingFields.join(", ")
                  : "None recorded"}
              </dd>
            </div>
          </dl>
          {hospital.dataQuality.addressMismatch ? (
            <div className="address-block">
              <p className="label">Known address discrepancy</p>
              <p>
                Historical CMS cost-report address:{" "}
                <strong>{hospital.dataQuality.cmsCostReportAddress ?? "Not recorded"}</strong>
              </p>
              <p>
                Other directory address:{" "}
                <strong>{hospital.dataQuality.otherDirectoryAddress ?? "Not recorded"}</strong>
              </p>
              {hospital.dataQuality.addressEvidence.map((item) => (
                <p className="tiny" key={`${item.role}-${item.address}`}>
                  {item.role === "cms_cost_report" ? "CMS cost-report source" : "Directory source"} ({item.verification}
                  {item.retrievedAt ? `, ${item.retrievedAt}` : ""}): {item.source}
                </p>
              ))}
              <p className="muted small">
                An address difference is an identity-review item. It does not prove a physician departure.
              </p>
            </div>
          ) : null}
          {hospital.dataQuality.warnings.length > 0 ? (
            <ul className="reason-list">
              {hospital.dataQuality.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
          {Object.keys(hospital.metricDefinitions).length > 0 ? (
            <div className="address-block">
              <p className="label">Metric definitions</p>
              {Object.entries(hospital.metricDefinitions).map(([key, definition]) => (
                <p className="tiny" key={key}>
                  <strong>{key}:</strong> {definition}
                </p>
              ))}
            </div>
          ) : null}
        </section>
      </aside>
    </div>
  );
}
