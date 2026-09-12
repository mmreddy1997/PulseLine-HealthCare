# PulseLine financial forecasting proposal

Recorded September 12, 2026 from user-supplied research. Status: proposal, not implemented or validated forecasting capability.

## Evidence and interpretation notes

- All example hospital figures, forecast ranges and pressure classifications below are illustrative, not observations or model outputs for real hospitals. The sample ranges are not calibrated prediction intervals.
- The supplied text is preserved below. Its statements about possible usefulness and drivers are hypotheses, not established results. “CMS Cost Reports” is a source lead without an exact citation in the attachment.
- Annual, delayed HCRIS data may support fiscal-year scenarios; a current 6–12-month forecast requires adequate data freshness, timestamped releases and validation. A reporting period ending before a forecast cutoff does not establish public availability by that cutoff.
- Public-availability dates that cannot be verified remain unknown; such observations cannot support a claim of a legitimate point-in-time backtest. Historical revised reports require vintage controls.
- Five hospitals offer exploratory demonstrations, not sufficient evidence of predictive generalization. Check scale, reporting scope, fiscal dates, ownership changes and CAH/PPS transitions before comparing trajectories.
- Evaluate revenue/expense/utilization forecasts against simple baselines with later held-out periods, error metrics and interval coverage. Test whether extra domains improve on financial-only inputs using the same eligible observations.
- “None observed” for structural activity requires a defined search window and coverage; otherwise show unknown. Forecasted pressure does not prove bankruptcy, closure or acquisition.
- Use free public institutional and aggregate sources only. No personal clinician histories or patient records. Keep proposed forecasts separate from verified observations, mock examples and historical event labels.

## Supplied research narrative

Financial forecasting asks:
“Based on historical trends, what might this hospital's financial position look like over the next 6–12 months?”

That's much more defensible than:
“This hospital will be acquired in six months.”

For PulseLine, you could forecast variables such as net patient revenue, operating expenses, operating margin, net income, liquidity/current ratio, inpatient volume, uncompensated care, and possibly payer mix. CMS HCRIS is particularly useful because Medicare-certified institutional providers submit annual cost reports containing facility characteristics, utilization, costs/charges and financial-statement information. CMS Cost Reports
A simple example
Suppose a rural hospital historically looks like this:
Year	Revenue	Expenses	Operating Margin	Discharges
2018	$82M	$80M	+2.4%	3,100
2019	$80M	$80M	0.0%	2,950
2020	$78M	$81M	-3.8%	2,700
2021	$76M	$83M	-9.2%	2,400


PulseLine could identify:
Revenue: ↓
Expenses: ↑
Margin: deteriorating
Patient volume: ↓
Then a forecasting model could estimate something like:
2022 expected revenue: $73–76M
2022 expected expenses: $84–87M
expected operating margin: negative
Ideally, we'd show a range, not just one number.
That lets a public-sector analyst see:
“If recent trends continue, financial pressure is expected to worsen.”

That's useful without claiming the hospital will close or be acquired.
Where the M&A variables become useful
The variables we just discussed can also become forecast drivers.
I would structure the forecasting layer roughly like this:
Financial drivers: historical revenue, expenses, margins, liquidity, liabilities, uncompensated care.
Operational drivers: discharges, inpatient days, occupancy, outpatient activity.
Market drivers: population trend, age distribution, poverty, insurance coverage.
Workforce/access drivers: provider availability and shortage measures.
Structural variables: bankruptcy, ownership restructuring, CAH/REH status, property transactions.
Then you're asking whether those variables help forecast the hospital's future financial condition.
For example:
Population decline → lower potential patient base → utilization pressure → revenue pressure.

Or:
Labor/operating expense growth > revenue growth → margin compression.

Or:
Declining discharges + declining revenue + increasing expenses → worsening projected operating margin.

Those are testable relationships rather than arbitrary "risk points."
I'd actually give PulseLine two forecasting layers
Layer 1 — Financial Forecast
This is quantitative:
Revenue → forecast
Expenses → forecast
Operating margin → forecast
Utilization → forecast
Liquidity → forecast where data supports it
For example:
Operating margin forecast
Current: -3.1%
12-month forecast range: -4.0% to -6.2%

Then explain the drivers:
Expense growth is exceeding revenue growth while inpatient utilization is declining.

Layer 2 — Pressure Outlook
This is explanatory rather than pretending to be a precise probability:
Financial pressure: Increasing

Utilization pressure: Increasing

Workforce/access pressure: Persistent

Community vulnerability: Elevated

Structural activity: None observed

That combination is far more useful to a policymaker than:
“Risk score = 78.”

And our five hospitals become excellent backtests
This is where the project gets much more interesting.
Take Paul B. Hall.
Pretend we're standing at:
December 31, 2019.
Give the forecasting model only information that would have been available at that time.
Forecast:
2020 financial condition.
Then move forward:
December 31, 2020.
Give it only information available by then.
Forecast:
2021 financial condition.
Then compare the forecasts against what actually happened.
Do exactly the same for:
Highlands
Kentucky River
Morgan County ARH
Breckinridge Memorial
Now you're testing something much stronger than:
“These hospitals looked troubled before an event.”

You're asking:
“Could historical public data forecast deterioration in rural hospital financial performance before we knew what happened next?”

One major limitation
HCRIS is largely annual and lagged, so I would be careful with the phrase "early warning."
A hospital's 2020 financial information may not necessarily have been publicly available on December 31, 2020. For a legitimate historical forecast, PulseLine must track:
reporting period end
versus
date the information became publicly available.
Otherwise we introduce data leakage—giving the model information that it couldn't actually have known at the forecast date.
That's one of the most important things your engineering team should implement.
Every observation should effectively have:
reporting_period
public_availability_date
forecast_cutoff_date
and only use the observation when:
public availability date ≤ forecast cutoff date.
This could actually improve PulseLine's positioning
Instead of pitching it primarily as:
“We predict rural hospital acquisitions or closures.”

which would be difficult to validate responsibly with five hospitals, I would position the initial prototype more like:
PulseLine uses historical financial, operational, workforce, and community data to identify changing rural-hospital pressure and forecast financial trajectories—giving healthcare leaders evidence to investigate potential problems earlier.

Then acquisitions, bankruptcies, service reductions and closures become historical outcomes against which you evaluate the signals, rather than things you promise to predict.
That is both more defensible analytically and much closer to what you can realistically demonstrate with the data you're collecting.