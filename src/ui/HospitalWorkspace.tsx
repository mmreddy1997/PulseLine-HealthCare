import { useEffect, useRef, useState } from "react";
import { investigationNextSteps } from "../../lib/investigate.ts";
import { flaggedExplanations } from "../../lib/score-financial.ts";
import { scoringConfig } from "../../lib/scoring-config.ts";
import type { AskContext, PulseAnswer } from "../../lib/ask/index.ts";
import type { EvidenceHospital, EvidenceObservation, HospitalView, StructuralEvent } from "../types.ts";
import { AskPane } from "./ask/AskPane.tsx";
import { ContextObservations, EventTimeline } from "./EventTimeline.tsx";
import { cycleFocus } from "./focus.ts";
import { factorDisplay, patientServiceResultNote, ScoreMeter, StatusGlyph } from "./hospital-display.tsx";
import { fiscalLabel, shortFiscalRange, statusClass } from "./format.ts";
import { SiteHeader } from "./SiteHeader.tsx";

export type WorkspacePane = "overview" | "reports" | "events" | "ask";

function useWideSplit() {
  const [wide, setWide] = useState(() => window.matchMedia("(min-width: 1100px)").matches);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1100px)");
    const onChange = () => setWide(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return wide;
}

function OverviewPane({
  view,
  research,
}: {
  view: HospitalView | null;
  research: EvidenceHospital | null;
}) {
  if (!view) {
    return (
      <section className="content-panel">
        <h3>Overview</h3>
        <p className="status-pill status-pending">Financial data pending</p>
        <p>
          No CCN, Kentucky license ID, cost-report financials, or stress score were invented for {research?.name ?? "this case"}.
        </p>
      </section>
    );
  }
  const explanations = flaggedExplanations(view.financial);
  const nextSteps = investigationNextSteps(view);
  return (
    <section className="content-panel">
      <h3>Overview</h3>
      <div className="overview-grid">
        <div>
          <span className="label">Financial stress</span>
          <ScoreMeter score={view.financial.score} status={view.financial.status} />
        </div>
        <div>
          <span className="label">Status</span>
          <p className={`status-pill ${statusClass(view.financial.status)}`}>
            {scoringConfig.statusLabels[view.financial.status]}
          </p>
          <span className="label">Coverage</span>
          <p>{view.financial.dataCoverage}</p>
        </div>
      </div>
      <p className="muted small">{view.financial.reconstruction.coverageNote}</p>
      <h4>Why it looks like this</h4>
      <ul className="reason-list">
        {explanations.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
      <p className="muted small">
        Explanations are generated from shared scoring configuration. The score is not a probability of closure or bankruptcy.
      </p>
      <details>
        <summary>What to investigate next</summary>
        <ul className="reason-list">
          {nextSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}

function ReportsPane({ view }: { view: HospitalView | null }) {
  if (!view) {
    return (
      <section className="content-panel">
        <h3>Reports</h3>
        <p className="status-pill status-pending">Financial data pending</p>
        <p className="muted small">No CMS fiscal reports are available in PulseLine for this research case.</p>
      </section>
    );
  }
  const { hospital, financial, workforce, pulse } = view;
  return (
    <section className="content-panel">
      <h3>Reports</h3>
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
      <p className="muted small">Derived patient-service result: {patientServiceResultNote(hospital)}</p>
      <details>
        <summary>Score reconstruction</summary>
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
            <dd>{financial.reconstruction.roundedScore === null ? "null" : financial.reconstruction.roundedScore}</dd>
          </div>
        </dl>
        <p className="muted small">{financial.reconstruction.rounding}</p>
      </details>
      <details>
        <summary>Data quality and sources</summary>
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
            <dt>Fiscal dates</dt>
            <dd>{fiscalLabel(hospital.fiscalYearStart, hospital.fiscalYearEnd)}</dd>
          </div>
          <div>
            <dt>Identity</dt>
            <dd>
              {hospital.dataQuality.identityStatus === "unresolved"
                ? "Identity verification required"
                : hospital.dataQuality.identityStatus}
            </dd>
          </div>
          <div>
            <dt>Missing metrics</dt>
            <dd>
              {hospital.dataQuality.missingFields.length ? hospital.dataQuality.missingFields.join(", ") : "None recorded"}
            </dd>
          </div>
        </dl>
        {hospital.dataQuality.addressMismatch ? (
          <div className="address-block">
            <p className="label">Known address discrepancy</p>
            <p>
              Historical CMS cost-report address: <strong>{hospital.dataQuality.cmsCostReportAddress ?? "Not recorded"}</strong>
            </p>
            <p>
              Other directory address: <strong>{hospital.dataQuality.otherDirectoryAddress ?? "Not recorded"}</strong>
            </p>
            <p className="muted small">
              An address difference is an identity-review item. It does not prove a physician departure.
            </p>
          </div>
        ) : null}
        <p className="status-pill status-pending">Workforce pending / experimental</p>
        <p className="muted small">{workforce.explanation}</p>
        <p className="muted small">
          {pulse.severity === "insufficient_evidence"
            ? "Insufficient evidence for multi-signal deterioration"
            : "Combined signal not triggered"}
        </p>
      </details>
    </section>
  );
}

function EventsPane({
  events,
  observations,
  emptyLabel,
}: {
  events: StructuralEvent[];
  observations: EvidenceObservation[];
  emptyLabel: string;
}) {
  return (
    <section className="content-panel">
      <h3>Events</h3>
      <p className="muted small">
        Sourced timeline, separate from the financial score. A null publication date is not historical eligibility.
      </p>
      <EventTimeline events={events} emptyLabel={emptyLabel} />
      <ContextObservations observations={observations} domain="operational" title="Hospital pressure context" />
      <ContextObservations observations={observations} domain="community" title="Community context" />
      <ContextObservations observations={observations} domain="workforce_access" title="County access context" />
    </section>
  );
}

function EvidenceShelf({
  reports,
  view,
  onSelectReport,
}: {
  reports: HospitalView[];
  view: HospitalView | null;
  onSelectReport: (id: string) => void;
}) {
  return (
    <aside className="evidence-shelf" aria-label="Evidence shelf">
      <h3>Evidence shelf</h3>
      <p className="tiny">
        {reports.length > 0 ? `${reports.length} fiscal reports available` : "No CMS fiscal reports in PulseLine yet."}
      </p>
      <div className="shelf-years">
        {reports.map((report) => (
          <button
            type="button"
            key={report.hospital.id}
            className={report.hospital.id === view?.hospital.id ? "shelf-year active" : "shelf-year"}
            onClick={() => onSelectReport(report.hospital.id)}
          >
            {shortFiscalRange(report.hospital.fiscalYearStart, report.hospital.fiscalYearEnd)}
          </button>
        ))}
      </div>
      {view ? (
        <ul className="shelf-notes">
          <li>Coverage: {view.financial.dataCoverage}</li>
          <li>
            {view.hospital.dataQuality.identityStatus === "unresolved"
              ? "Identity review required"
              : "Identity review not flagged"}
          </li>
          <li>Historical reports, not live data</li>
        </ul>
      ) : (
        <ul className="shelf-notes">
          <li>Financial data pending</li>
          <li>No score assigned</li>
        </ul>
      )}
    </aside>
  );
}

function ContextRail({ pending }: { pending: boolean }) {
  return (
    <aside className="context-rail" aria-label="Keep the context">
      <h3>Keep the context</h3>
      <p>This answer uses only the selected hospital’s public data.</p>
      <p>Missing information stays visible. A property sale does not establish a provider ownership change.</p>
      {pending ? <p>Research cases have no score until financial data is available.</p> : null}
      <h4>Downloads</h4>
      <p>Only selected questions, answers, periods, and sources. No full-dataset export.</p>
    </aside>
  );
}

export function HospitalWorkspace({
  title,
  subtitle,
  pending,
  view,
  reports,
  events,
  observations,
  research,
  askContext,
  answers,
  selectedIds,
  onAnswers,
  onSelectedIds,
  onClearConversation,
  onSelectReport,
  onClose,
}: {
  title: string;
  subtitle: string;
  pending: boolean;
  view: HospitalView | null;
  reports: HospitalView[];
  events: StructuralEvent[];
  observations: EvidenceObservation[];
  research: EvidenceHospital | null;
  askContext: AskContext;
  answers: PulseAnswer[];
  selectedIds: string[];
  onAnswers: (answers: PulseAnswer[]) => void;
  onSelectedIds: (ids: string[]) => void;
  onClearConversation: () => void;
  onSelectReport: (id: string) => void;
  onClose: () => void;
}) {
  const [pane, setPane] = useState<WorkspacePane>("ask");
  const wide = useWideSplit();
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const openedId = view?.hospital.hospitalId ?? research?.hospitalId ?? title;
  const ccnLine = view
    ? [
        view.hospital.historicalCcn ? `Reported CCN ${view.hospital.historicalCcn}` : null,
        view.hospital.currentCcn && view.hospital.currentCcn !== view.hospital.historicalCcn
          ? `Current CCN ${view.hospital.currentCcn}`
          : view.hospital.ccnAsReported && !view.hospital.historicalCcn
            ? `Reported CCN ${view.hospital.ccnAsReported}`
            : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const panel = panelRef.current;
    if (!panel) return undefined;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key === "Tab" && panel) cycleFocus(panel, event);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [openedId]);

  const showAskDesk = pane === "ask" && wide;

  return (
    <div className="drawer-layer">
      <button type="button" className="drawer-backdrop" aria-label="Close hospital workspace" onClick={onClose} />
      <aside ref={panelRef} className="workspace" role="dialog" aria-modal="true" aria-labelledby="workspace-title">
        <SiteHeader
          onHome={onClose}
          closeLabel="Close"
          onClose={wide ? undefined : onClose}
          closeRef={wide ? undefined : closeRef}
        />

        {wide ? (
          <header className="workspace-hero">
            <p className="brand-kicker">Kentucky / Historical hospital evidence</p>
            <h1>Understand financial pressure at rural Kentucky hospitals.</h1>
            <p className="lede">
              Explore historical financial reports, documented events, and the evidence behind them. Select a hospital
              to compare reporting years, ask questions about available data, and download sourced answers.
            </p>
          </header>
        ) : (
          <p className="eyebrow">{pending ? "Research case" : "Hospital workspace"}</p>
        )}
        <div className="hospital-bar">
          <div>
            <h2 id="workspace-title">{title}</h2>
            <p className="muted">
              {wide
                ? [subtitle, ccnLine].filter(Boolean).join(" · ")
                : `${subtitle}${pending ? " · Historical CMS reports pending" : " · Historical CMS reports"}`}
            </p>
          </div>
          <div className="hospital-bar-actions">
            {wide ? (
              <button type="button" className="chip" ref={closeRef} onClick={onClose}>
                Change hospital
              </button>
            ) : null}
            {pending ? (
              <p className="status-pill status-pending">
                <StatusGlyph status="pending" />
                Financial data pending
              </p>
            ) : view ? (
              <p className={`status-pill ${statusClass(view.financial.status)}`}>
                <StatusGlyph status={view.financial.status} />
                {view.financial.score !== null ? `${view.financial.score} · ` : ""}
                {scoringConfig.statusLabels[view.financial.status]}
              </p>
            ) : null}
            {!wide && view ? <p className="coverage-line">Coverage: {view.financial.dataCoverage}</p> : null}
          </div>
        </div>

        <div className="workspace-tabs" role="tablist" aria-label="Hospital sections">
          {(["overview", "reports", "events", "ask"] as const).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={pane === item}
              className={pane === item ? "tab active" : "tab"}
              onClick={() => setPane(item)}
            >
              {item === "overview"
                ? "Overview"
                : item === "reports"
                  ? "Reports"
                  : item === "events"
                    ? "Events"
                    : wide
                      ? "PulseLine Ask"
                      : "Ask"}
            </button>
          ))}
        </div>

        {!wide && reports.length > 0 ? (
          <label className="period-select">
            <span className="visually-hidden">Fiscal period</span>
            <select
              value={view?.hospital.id ?? ""}
              onChange={(event) => onSelectReport(event.target.value)}
            >
              {reports.map((report) => (
                <option key={report.hospital.id} value={report.hospital.id}>
                  {shortFiscalRange(report.hospital.fiscalYearStart, report.hospital.fiscalYearEnd)}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {showAskDesk ? (
          <div className="ask-desk">
            <EvidenceShelf reports={reports} view={view} onSelectReport={onSelectReport} />
            <AskPane
              context={askContext}
              answers={answers}
              selectedIds={selectedIds}
              onAnswers={onAnswers}
              onSelectedIds={onSelectedIds}
              onClear={onClearConversation}
            />
            <ContextRail pending={pending} />
          </div>
        ) : (
          <div className="workspace-body">
            {pane === "overview" ? <OverviewPane view={view} research={research} /> : null}
            {pane === "reports" ? <ReportsPane view={view} /> : null}
            {pane === "events" ? (
              <EventsPane
                events={events}
                observations={observations}
                emptyLabel={
                  pending
                    ? "No structural events are attached to this research case."
                    : "No verified structural events are attached to this hospital in the current evidence ledger."
                }
              />
            ) : null}
            {pane === "ask" ? (
              <AskPane
                context={askContext}
                answers={answers}
                selectedIds={selectedIds}
                onAnswers={onAnswers}
                onSelectedIds={onSelectedIds}
                onClear={onClearConversation}
              />
            ) : null}
          </div>
        )}

        <footer className="workspace-footer">
          <p>Because we believe your ZIP code should not determine the quality of care you receive.</p>
          <p>Experimental evidence dashboard · Not a closure forecast</p>
        </footer>
      </aside>
    </div>
  );
}
