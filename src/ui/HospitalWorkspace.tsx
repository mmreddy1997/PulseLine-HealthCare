import { useEffect, useMemo, useRef, useState } from "react";
import { diligenceGaps, EMPTY_EVENT_LEDGER } from "../../lib/diligence/gaps.ts";
import { financialChartSeries, moneySeries } from "../../lib/charts/series.ts";
import type { ExplorerHospital } from "../../lib/explorer/types.ts";
import { evaluateScenario, resetScenarioInputs } from "../../lib/scenario/whatif.ts";
import type { AskContext, PulseAnswer } from "../../lib/ask/index.ts";
import type { EvidenceHospital, EvidenceObservation, HospitalView, StructuralEvent } from "../types.ts";
import { AskPane } from "./ask/AskPane.tsx";
import { FinancialChart } from "./charts/FinancialChart.tsx";
import { GapList } from "./diligence/GapList.tsx";
import { ContextObservations, EventTimeline } from "./EventTimeline.tsx";
import { FinancialCards } from "./finance/FinancialCards.tsx";
import { FinancialStatements } from "./finance/FinancialStatements.tsx";
import { GuidedBrief } from "./finance/GuidedBrief.tsx";
import { PeriodMeta } from "./finance/PeriodMeta.tsx";
import { cycleFocus } from "./focus.ts";
import { factorDisplay, StatusGlyph } from "./hospital-display.tsx";
import { fiscalLabel, shortFiscalRange, statusClass } from "./format.ts";
import { WhatIfPanel } from "./scenario/WhatIfPanel.tsx";
import { ScoreRubricPanel } from "./score/ScoreRubric.tsx";
import { HospitalSelector } from "./selector/HospitalSelector.tsx";
import { SiteHeader } from "./SiteHeader.tsx";

export type WorkspacePane = "overview" | "financials" | "scenarios" | "evidence" | "ask";

const PANE_LABELS: Record<WorkspacePane, string> = {
  overview: "Overview",
  financials: "Financials",
  scenarios: "Scenarios",
  evidence: "Evidence",
  ask: "Ask",
};

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
  reports,
  events,
  observations,
  pending,
}: {
  view: HospitalView | null;
  research: EvidenceHospital | null;
  reports: HospitalView[];
  events: StructuralEvent[];
  observations: EvidenceObservation[];
  pending: boolean;
}) {
  const gaps = diligenceGaps({ view, research, events, observations, pending });
  if (!view) {
    return (
      <section className="content-panel">
        <h3>Overview</h3>
        <p className="status-pill status-pending">Financial data pending</p>
        <p>No CCN, financials, score, charts, or scenario baseline were invented for {research?.name ?? "this case"}.</p>
        <h4>Sourced events remain available</h4>
        {events.length > 0 ? <EventTimeline events={events} /> : <p className="tiny">{EMPTY_EVENT_LEDGER}</p>}
        <h4>What requires verification</h4>
        <GapList gaps={gaps} />
      </section>
    );
  }
  const series = financialChartSeries(reports);
  const revenue = series.find((item) => item.id === "npr_expenses");
  const expenses = moneySeries(
    reports,
    "operating_expenses",
    "Patient-service expenses",
    "How did expenses compare?",
    "CMS Less Total Operating Expense.",
    (report) => report.hospital.financials.operatingExpenses,
  );
  return (
    <section className="content-panel">
      <GuidedBrief view={view} reports={reports} />
      <h3>Financial dashboard</h3>
      <FinancialCards view={view} />
      <div className="chart-grid">
        {revenue ? <FinancialChart series={revenue} extra={expenses} compact /> : null}
        {series
          .filter((item) => ["patient_service_result", "cash", "current_ratio"].includes(item.id))
          .map((item) => (
            <FinancialChart key={item.id} series={item} compact />
          ))}
      </div>
      <aside className="score-secondary">
        <p className="label">Experimental concern score</p>
        <p className="tiny">Secondary to the financial records. Not acquisition attractiveness or a forecast.</p>
        <ScoreRubricPanel result={view.financial} compact />
      </aside>
    </section>
  );
}

function FinancialsPane({ view, reports }: { view: HospitalView | null; reports: HospitalView[] }) {
  if (!view) {
    return (
      <section className="content-panel">
        <h3>Financials</h3>
        <p className="status-pill status-pending">Financial data pending</p>
        <p>Charts and statements stay disabled until sourced financials exist.</p>
      </section>
    );
  }
  const series = financialChartSeries(reports);
  const expenses = moneySeries(
    reports,
    "operating_expenses",
    "Patient-service expenses",
    "How did Less Total Operating Expense change across reports?",
    "CMS Less Total Operating Expense.",
    (report) => report.hospital.financials.operatingExpenses,
  );
  return (
    <section className="content-panel">
      <h3>Historical financial dashboard</h3>
      <div className="chart-grid">
        {series
          .filter((item) => item.id !== "operating_expenses" && item.id !== "score_history")
          .map((item) => (
            <FinancialChart key={item.id} series={item} extra={item.id === "npr_expenses" ? expenses : null} />
          ))}
      </div>
      <FinancialStatements reports={reports} />
      <details>
        <summary>Metric definitions and sources</summary>
        <ul className="signal-list">
          {view.financial.factors.map((factor) => (
            <li key={factor.id}>
              <div className="signal-head">
                <strong>{factor.metric}</strong>
                <span>{factorDisplay(factor)}</span>
              </div>
              <p className="tiny">{factor.formula}</p>
            </li>
          ))}
        </ul>
        <p className="tiny">
          Source:{" "}
          {view.hospital.sourceUrl ? (
            <a href={view.hospital.sourceUrl} target="_blank" rel="noreferrer">
              {view.hospital.sourceId ?? "CMS cost report"}
            </a>
          ) : (
            view.hospital.dataQuality.source
          )}{" "}
          · Report {view.hospital.reportRecordId ?? "Unknown"} · File cohort {view.hospital.fileCohort ?? "Unknown"} ·{" "}
          {fiscalLabel(view.hospital.fiscalYearStart, view.hospital.fiscalYearEnd)}
        </p>
      </details>
    </section>
  );
}

function EvidencePane({
  view,
  research,
  events,
  observations,
  pending,
}: {
  view: HospitalView | null;
  research: EvidenceHospital | null;
  events: StructuralEvent[];
  observations: EvidenceObservation[];
  pending: boolean;
}) {
  const gaps = diligenceGaps({ view, research, events, observations, pending });
  return (
    <section className="content-panel">
      <h3>Evidence</h3>
      <p className="muted small">
        Identity and transaction scope stay separate from the financial records. A blank event log is not a finding that
        no events occurred. County access is not hospital staffing.
      </p>
      {events.length > 0 ? <EventTimeline events={events} /> : <p className="tiny">{EMPTY_EVENT_LEDGER}</p>}
      <GapList gaps={gaps} />
      <ContextObservations observations={observations} domain="operational" title="Hospital pressure context" />
      <ContextObservations
        observations={observations}
        domain="community"
        title="Community context"
        contextNote="Community statistics speak to local access and service continuity. They are not hospital staffing counts and do not measure a transaction’s effect unless a sourced record says so."
      />
      <ContextObservations
        observations={observations}
        domain="workforce_access"
        title="County access context"
        contextNote="County access measures are not hospital employee counts and are kept separate from hospital financials."
      />
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
      <h3>Selected period</h3>
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
      {view ? <PeriodMeta view={view} /> : <p className="tiny">Financial data pending</p>}
    </aside>
  );
}

function ContextRail({ pending }: { pending: boolean }) {
  return (
    <aside className="context-rail" aria-label="Keep the context">
      <h3>Keep the context</h3>
      <p>This answer uses only the selected hospital’s public data.</p>
      <p>Missing information stays visible. A property sale does not establish a provider ownership change.</p>
      {pending ? <p>Research cases have no score or scenario model until financial data is available.</p> : null}
      <h4>Evidence notes</h4>
      <p>Download selected answers only. These are evidence notes, not a completed diligence assessment.</p>
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
  catalog,
  askContext,
  answers,
  selectedIds,
  onAnswers,
  onSelectedIds,
  onClearConversation,
  onSelectReport,
  onChangeHospital,
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
  catalog: ExplorerHospital[];
  askContext: AskContext;
  answers: PulseAnswer[];
  selectedIds: string[];
  onAnswers: (answers: PulseAnswer[]) => void;
  onSelectedIds: (ids: string[]) => void;
  onClearConversation: () => void;
  onSelectReport: (id: string) => void;
  onChangeHospital: (hospitalId: string) => void;
  onClose: () => void;
}) {
  const [pane, setPane] = useState<WorkspacePane>("overview");
  const [scenarioByReport, setScenarioByReport] = useState<Record<string, ReturnType<typeof resetScenarioInputs>>>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const reportKey = view?.hospital.id ?? "pending";
  const scenarioInputs = scenarioByReport[reportKey] ?? resetScenarioInputs();
  const scenario = useMemo(
    () => evaluateScenario(view, scenarioInputs, { pending, hospitalName: title }),
    [view, scenarioInputs, pending, title],
  );
  const askWithScenario = useMemo(() => ({ ...askContext, scenario }), [askContext, scenario]);
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
  const selectedHospitalId = view?.hospital.hospitalId ?? research?.hospitalId ?? null;

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
            <p className="brand-kicker">Historical hospital financial review</p>
          </header>
        ) : (
          <p className="eyebrow">{pending ? "Research case" : "Hospital financial brief"}</p>
        )}
        <div className="hospital-bar">
          <div>
            <h2 id="workspace-title">{title}</h2>
            <p className="muted">
              {wide ? [subtitle, ccnLine].filter(Boolean).join(" · ") : `${subtitle}${pending ? " · Financial data pending" : ""}`}
            </p>
            {view ? (
              <p className="tiny">
                Identity: {view.hospital.dataQuality.identityStatus === "unresolved" ? "review required" : "no PulseLine identity flag"}
              </p>
            ) : (
              <p className="tiny">Identity fields were not invented for this research case.</p>
            )}
            {view ? <PeriodMeta view={view} /> : null}
          </div>
          <div className="hospital-bar-actions">
            {wide ? (
              <button type="button" className="chip" ref={closeRef} onClick={() => setPickerOpen((open) => !open)}>
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
                Experimental score {view.financial.score ?? "none"}
              </p>
            ) : null}
            {!wide && view ? <p className="coverage-line">Coverage: {view.financial.dataCoverage}</p> : null}
          </div>
        </div>
        {pickerOpen ? (
          <HospitalSelector
            hospitals={catalog}
            selectedId={selectedHospitalId}
            onSelect={(hospitalId) => {
              setPickerOpen(false);
              onChangeHospital(hospitalId);
            }}
            label="Switch hospital"
          />
        ) : null}

        <div className="workspace-tabs" role="tablist" aria-label="Hospital sections">
          {(Object.keys(PANE_LABELS) as WorkspacePane[]).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={pane === item}
              className={pane === item ? "tab active" : "tab"}
              onClick={() => setPane(item)}
            >
              {PANE_LABELS[item]}
            </button>
          ))}
        </div>

        {reports.length > 0 ? (
          <label className="period-select">
            <span>Reporting period</span>
            <select value={view?.hospital.id ?? ""} onChange={(event) => onSelectReport(event.target.value)}>
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
              context={askWithScenario}
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
            {pane === "overview" ? (
              <OverviewPane
                view={view}
                research={research}
                reports={reports}
                events={events}
                observations={observations}
                pending={pending}
              />
            ) : null}
            {pane === "financials" ? <FinancialsPane view={view} reports={reports} /> : null}
            {pane === "scenarios" ? (
              <WhatIfPanel
                scenario={scenario}
                inputs={scenarioInputs}
                onChange={(inputs) => setScenarioByReport((current) => ({ ...current, [reportKey]: inputs }))}
                onReset={() => setScenarioByReport((current) => ({ ...current, [reportKey]: resetScenarioInputs() }))}
              />
            ) : null}
            {pane === "evidence" ? (
              <EvidencePane
                view={view}
                research={research}
                events={events}
                observations={observations}
                pending={pending}
              />
            ) : null}
            {pane === "ask" ? (
              <AskPane
                context={askWithScenario}
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
          <p>Experimental financial review · Not a valuation, deal recommendation, or diligence substitute</p>
        </footer>
      </aside>
    </div>
  );
}
