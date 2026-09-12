import { MAX_CHANGE_PCT, MIN_CHANGE_PCT, SCENARIO_LIMIT, type ScenarioInputs, type ScenarioResult } from "../../../lib/scenario/whatif.ts";
import { money } from "../format.ts";

export function WhatIfPanel({
  scenario,
  inputs,
  onChange,
  onReset,
}: {
  scenario: ScenarioResult;
  inputs: ScenarioInputs;
  onChange: (inputs: ScenarioInputs) => void;
  onReset: () => void;
}) {
  if (!scenario.enabled) {
    return (
      <section className="whatif-panel" aria-labelledby="whatif-title">
        <h3 id="whatif-title">Operating scenario</h3>
        <p className="scenario-banner">{SCENARIO_LIMIT}</p>
        <p>{scenario.disabledReason}</p>
      </section>
    );
  }

  return (
    <section className="whatif-panel" aria-labelledby="whatif-title">
      <h3 id="whatif-title">Operating scenario</h3>
      <p className="tiny">How would the simplified patient-service balance change under different revenue and expense assumptions?</p>
      <p className="scenario-banner">{SCENARIO_LIMIT}</p>
      <p className="tiny">
        Baseline is the selected actual report. Assumed percentages are user inputs, not observed data. Inputs are clamped from {MIN_CHANGE_PCT}% to {MAX_CHANGE_PCT}%. Those bounds are validation limits, not economically probable ranges.
      </p>
      <div className="whatif-controls">
        <label>
          Assumed net patient revenue change
          <input
            type="range"
            min={MIN_CHANGE_PCT}
            max={MAX_CHANGE_PCT}
            step={1}
            value={inputs.revenueChangePct}
            onChange={(event) => onChange({ ...inputs, revenueChangePct: Number(event.target.value) })}
          />
          <input
            type="number"
            min={MIN_CHANGE_PCT}
            max={MAX_CHANGE_PCT}
            step={1}
            value={inputs.revenueChangePct}
            onChange={(event) => onChange({ ...inputs, revenueChangePct: Number(event.target.value) })}
          />
          <span className="tiny">{inputs.revenueChangePct}%</span>
        </label>
        <label>
          Assumed patient-service expense change
          <input
            type="range"
            min={MIN_CHANGE_PCT}
            max={MAX_CHANGE_PCT}
            step={1}
            value={inputs.expenseChangePct}
            onChange={(event) => onChange({ ...inputs, expenseChangePct: Number(event.target.value) })}
          />
          <input
            type="number"
            min={MIN_CHANGE_PCT}
            max={MAX_CHANGE_PCT}
            step={1}
            value={inputs.expenseChangePct}
            onChange={(event) => onChange({ ...inputs, expenseChangePct: Number(event.target.value) })}
          />
          <span className="tiny">{inputs.expenseChangePct}%</span>
        </label>
        <button type="button" className="chip" onClick={onReset}>
          Reset to baseline
        </button>
      </div>
      <div className="metric-grid">
        <article>
          <span className="label">Scenario revenue</span>
          <strong>{money(scenario.scenarioRevenue)}</strong>
          <p className="tiny">Baseline {money(scenario.baselineRevenue)}</p>
        </article>
        <article>
          <span className="label">Scenario expenses</span>
          <strong>{money(scenario.scenarioExpenses)}</strong>
          <p className="tiny">Baseline {money(scenario.baselineExpenses)}</p>
        </article>
        <article>
          <span className="label">Scenario balance</span>
          <strong>{money(scenario.scenarioBalance)}</strong>
          <p className="tiny">Change {money(scenario.balanceChange)}</p>
        </article>
        <article>
          <span className="label">Revenue to equal scenario expenses</span>
          <strong>{money(scenario.revenueToEqualExpenses)}</strong>
          <p className="tiny">
            {scenario.requiredRevenueChangePct === null
              ? "Required change from baseline revenue is not calculated when baseline revenue is zero."
              : `Required change from baseline revenue: ${scenario.requiredRevenueChangePct.toFixed(1)}%`}
          </p>
        </article>
      </div>
      <figure className="chart-block is-compact">
        <figcaption>
          <strong>Baseline versus scenario</strong>
        </figcaption>
        <div className="whatif-bars" aria-hidden="true">
          <span style={{ width: barWidth(scenario.baselineBalance, scenario.scenarioBalance) }} className="base" />
          <span style={{ width: barWidth(scenario.scenarioBalance, scenario.baselineBalance) }} className="next" />
        </div>
        <table className="chart-table">
          <thead>
            <tr>
              <th scope="col">Item</th>
              <th scope="col">Baseline</th>
              <th scope="col">Scenario</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Net patient revenue</th>
              <td>{money(scenario.baselineRevenue)}</td>
              <td>{money(scenario.scenarioRevenue)}</td>
            </tr>
            <tr>
              <th scope="row">Patient-service expenses</th>
              <td>{money(scenario.baselineExpenses)}</td>
              <td>{money(scenario.scenarioExpenses)}</td>
            </tr>
            <tr>
              <th scope="row">Simplified patient-service balance</th>
              <td>{money(scenario.baselineBalance)}</td>
              <td>{money(scenario.scenarioBalance)}</td>
            </tr>
          </tbody>
        </table>
      </figure>
      <details>
        <summary>Assumptions and formulas</summary>
        <p className="tiny">Baseline period: {scenario.baselinePeriod}. Assumed percentages are not observed data.</p>
        <ul className="tiny">
          {scenario.formulas.map((formula) => (
            <li key={formula}>{formula}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}

function barWidth(value: number | null, other: number | null): string {
  const left = Math.abs(value ?? 0);
  const right = Math.abs(other ?? 0);
  const max = Math.max(left, right, 1);
  return `${Math.round((left / max) * 100)}%`;
}
