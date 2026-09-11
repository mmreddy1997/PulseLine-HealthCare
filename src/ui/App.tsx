import { useMemo, useState } from "react";
import extract from "../../data/cms/ky-rural-hospital-extract.json";
import { flaggedExplanations } from "../../lib/score-financial.ts";
import { buildHospitalViews, type HospitalExtractFile } from "../../lib/pipeline.ts";
import type { HospitalView, ScoreFactor } from "../types.ts";
import { fiscalLabel, money, percent, ratio, statusClass } from "./format.ts";

function factorDisplay(factor: ScoreFactor): string {
  if (!factor.available || factor.rawValue === null) {
    return "Not available in current dataset";
  }
  if (factor.metric === "Operating Margin") return percent(factor.rawValue);
  if (factor.metric === "Patient Volume") return percent(factor.rawValue);
  return ratio(factor.rawValue);
}

function ScoreMeter({ score, status }: { score: number; status: HospitalView["financial"]["status"] }) {
  return (
    <div className={`score-meter ${statusClass(status)}`}>
      <div className="score-meter-value">{score}</div>
      <div className="score-meter-scale">/ 100</div>
      <div className="score-meter-bar" aria-hidden="true">
        <span style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function HospitalDrawer({
  view,
  onClose,
}: {
  view: HospitalView;
  onClose: () => void;
}) {
  const { hospital, financial, workforce, pulse } = view;
  const explanations = flaggedExplanations(financial);

  return (
    <div className="drawer-layer">
      <button type="button" className="drawer-backdrop" aria-label="Close hospital detail" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-labelledby="drawer-title">
        <header className="drawer-header">
          <p className="eyebrow">Hospital deep dive</p>
          <h2 id="drawer-title">{hospital.name}</h2>
          <p className="muted">
            {hospital.city}, {hospital.state}
            {hospital.county ? ` · ${hospital.county} County` : ""} · CCN {hospital.ccn}
          </p>
          <button type="button" className="close-btn" onClick={onClose}>
            Close
          </button>
        </header>

        <section>
          <h3>PulseLine overview</h3>
          <div className="overview-grid">
            <div>
              <span className="label">Financial stress</span>
              <ScoreMeter score={financial.score} status={financial.status} />
            </div>
            <div>
              <span className="label">Status</span>
              <p className={`status-pill ${statusClass(financial.status)}`}>{financial.status}</p>
              <span className="label">Confidence</span>
              <p>{financial.confidence}</p>
            </div>
          </div>
        </section>

        <section>
          <h3>Financial signals</h3>
          <ul className="signal-list">
            {financial.factors.map((factor) => (
              <li key={factor.metric}>
                <div className="signal-head">
                  <strong>{factor.metric}</strong>
                  <span>{factorDisplay(factor)}</span>
                </div>
                <p className="muted small">{factor.reason}</p>
                {factor.available && factor.normalizedRisk !== null ? (
                  <p className="tiny">
                    Risk contribution {Math.round(factor.normalizedRisk)} / 100 · source {factor.source}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3>Why is this hospital flagged?</h3>
          {explanations.length === 0 ? (
            <p>No scored factor is currently in the elevated-risk band. The hospital still appears because it is part of the Kentucky radar set.</p>
          ) : (
            <ul className="reason-list">
              {explanations.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          )}
          <p className="muted small">Explanations are generated from the scoring engine, not from a language model.</p>
        </section>

        <section>
          <h3>Workforce signal</h3>
          <p className="status-pill status-pending">Pending longitudinal NPPES integration</p>
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
          <p className="muted small">
            Financial stress is visible, but PulseLine requires longitudinal workforce evidence before triggering
            its combined early-warning signal.
          </p>
        </section>

        <section>
          <h3>Data quality</h3>
          <dl className="meta-list">
            <div>
              <dt>Source</dt>
              <dd>{hospital.dataQuality.source}</dd>
            </div>
            <div>
              <dt>Fiscal date</dt>
              <dd>{fiscalLabel(hospital.fiscalYearStart, hospital.fiscalYearEnd)}</dd>
            </div>
            <div>
              <dt>Identity status</dt>
              <dd>{hospital.dataQuality.identityStatus === "unresolved" ? "Identity verification required" : hospital.dataQuality.identityStatus}</dd>
            </div>
            <div>
              <dt>Missing metrics</dt>
              <dd>{hospital.dataQuality.missingFields.length ? hospital.dataQuality.missingFields.join(", ") : "None recorded"}</dd>
            </div>
          </dl>
          {hospital.dataQuality.cmsCostReportAddress || hospital.dataQuality.otherDirectoryAddress ? (
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
        </section>
      </aside>
    </div>
  );
}

export function App() {
  const views = useMemo(() => buildHospitalViews(extract as HospitalExtractFile), []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = views.find((view) => view.hospital.id === selectedId) ?? null;
  const ranked = [...views].sort((a, b) => b.financial.score - a.financial.score);

  return (
    <div className="page">
      <header className="hero">
        <p className="brand-kicker">Kentucky · Rural / safety-net</p>
        <h1>PulseLine</h1>
        <p className="tagline">Early Warning Intelligence for Rural Healthcare</p>
        <p className="lede">
          Detecting emerging financial and workforce instability before healthcare access deteriorates.
        </p>
      </header>

      <section className="radar">
        <div className="section-head">
          <h2>Kentucky hospital radar</h2>
          <p>
            Three observed CMS cost-report summaries. This is exploratory decision support, not a bankruptcy
            predictor.
          </p>
        </div>
        <div className="card-grid">
          {ranked.map((view) => (
            <button
              type="button"
              key={view.hospital.id}
              className={`hospital-card ${statusClass(view.financial.status)}`}
              onClick={() => setSelectedId(view.hospital.id)}
            >
              <div className="card-top">
                <h3>{view.hospital.name}</h3>
                <span className={`status-pill ${statusClass(view.financial.status)}`}>
                  {view.financial.status.toUpperCase()}
                </span>
              </div>
              <p className="muted">
                {view.hospital.city}
                {view.hospital.county ? `, ${view.hospital.county} County` : ""} · CCN {view.hospital.ccn}
              </p>
              <div className="card-score">
                <span className="label">Financial stress</span>
                <strong>{view.financial.score}</strong>
              </div>
              <p className="tiny">Fiscal period: {fiscalLabel(view.hospital.fiscalYearStart, view.hospital.fiscalYearEnd)}</p>
              <p className="tiny">
                Data quality:{" "}
                {view.hospital.dataQuality.identityStatus === "unresolved"
                  ? "Identity verification required"
                  : `${view.hospital.dataQuality.missingFields.length} missing field(s)`}
              </p>
            </button>
          ))}
        </div>
      </section>

      <section className="snapshot">
        <h2>What the current extract can show</h2>
        <div className="snapshot-grid">
          {ranked.map((view) => (
            <article key={`${view.hospital.id}-snap`}>
              <h3>{view.hospital.name}</h3>
              <p>Operating revenue {money(view.hospital.financials.operatingRevenue)}</p>
              <p>Operating margin {percent(view.hospital.financials.operatingMargin)}</p>
              <p>Uncompensated care {money(view.hospital.financials.uncompensatedCare)}</p>
              <p>Cash {money(view.hospital.financials.cash)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="methodology" id="methodology">
        <h2>Methodology &amp; limitations</h2>
        <ul>
          <li>CMS cost reports are historical financial observations, not forecasts.</li>
          <li>PulseLine currently demonstrates financial distress scoring from fields present in this extract.</li>
          <li>NPPES does not establish hospital employment.</li>
          <li>Practice-location changes do not necessarily indicate physician departure.</li>
          <li>Longitudinal workforce analysis requires historical snapshots, which are not integrated yet.</li>
          <li>Three hospitals demonstrate workflow, not predictive validity.</li>
          <li>PulseLine is a hackathon decision-support prototype, not a validated 6–12 month model.</li>
        </ul>
      </section>

      {selected ? <HospitalDrawer view={selected} onClose={() => setSelectedId(null)} /> : null}
    </div>
  );
}
