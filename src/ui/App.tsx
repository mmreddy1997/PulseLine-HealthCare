import { useCallback, useMemo, useState } from "react";
import evidencePack from "../../research/PulseLine_expanded_evidence_v1.json";
import researchPack from "../../research/PulseLine_three_hospital_data.json";
import { adaptEvidencePack, eventsForHospital, observationsForHospital } from "../../lib/adapt-evidence.ts";
import { researchAskContext, scoredAskContext, type PulseAnswer } from "../../lib/ask/index.ts";
import { buildExplorerCatalog } from "../../lib/explorer/index.ts";
import { loadResearchDashboard } from "../../lib/pipeline.ts";
import { HospitalExplorer } from "./explorer/HospitalExplorer.tsx";
import { HospitalWorkspace } from "./HospitalWorkspace.tsx";
import { FullScoringRubric } from "./score/ScoreRubric.tsx";
import { HospitalSelector } from "./selector/HospitalSelector.tsx";
import { SiteHeader } from "./SiteHeader.tsx";

export function App() {
  const loaded = useMemo(() => loadResearchDashboard(researchPack), []);
  const evidence = useMemo(() => adaptEvidencePack(evidencePack), []);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedResearchId, setSelectedResearchId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Record<string, PulseAnswer[]>>({});
  const [selectedByHospital, setSelectedByHospital] = useState<Record<string, string[]>>({});

  const researchCases = useMemo(
    () => evidence.ledger?.hospitals.filter((hospital) => hospital.financialCoverage === "pending") ?? [],
    [evidence.ledger],
  );
  const catalog = useMemo(
    () => buildExplorerCatalog(loaded.ok ? loaded.facilities : [], researchCases, evidence.ledger?.events ?? []),
    [loaded, researchCases, evidence.ledger],
  );
  const selectedFacility = loaded.facilities.find((facility) => facility.hospitalId === selectedHospitalId) ?? null;
  const selected =
    selectedFacility?.reports.find((report) => report.hospital.id === selectedReportId) ??
    selectedFacility?.latest ??
    null;
  const selectedResearch = researchCases.find((hospital) => hospital.hospitalId === selectedResearchId) ?? null;
  const otherNames = [
    ...loaded.facilities.map((facility) => facility.name),
    ...researchCases.map((hospital) => hospital.name),
  ];

  const openHospital = useCallback((hospitalId: string) => {
    const facility = loaded.facilities.find((item) => item.hospitalId === hospitalId);
    if (facility) {
      setSelectedResearchId(null);
      setSelectedHospitalId(facility.hospitalId);
      setSelectedReportId(facility.latest.hospital.id);
      return;
    }
    const research = researchCases.find((item) => item.hospitalId === hospitalId);
    if (research) {
      setSelectedHospitalId(null);
      setSelectedReportId(null);
      setSelectedResearchId(research.hospitalId);
    }
  }, [loaded.facilities, researchCases]);

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
        <p className="brand-kicker">Healthcare M&amp;A and strategy financial review</p>
        <h1>Review one hospital’s historical financials, then test transparent operating assumptions.</h1>
        <p className="lede">
          Choose a hospital, understand the available CMS reports, explore a simplified patient-service scenario, and
          see what still needs verification.
        </p>
        <p className="audience">Working product hypothesis for healthcare M&amp;A, corporate development, and strategy teams.</p>
        <div className="hero-actions">
          <a className="btn-primary" href="#hospitals">
            Choose a hospital
          </a>
          <a className="btn-secondary" href="#methodology">
            How it works
          </a>
        </div>
        <p className="tiny">
          Experimental financial-research tool. Not a valuation platform, deal recommendation engine, or substitute for
          professional diligence. This is a product hypothesis, not a validated customer requirement.
        </p>
      </header>

      {!loaded.ok ? (
        <section className="extract-error" role="alert">
          <h2>Dashboard extract failed validation</h2>
          <p>The hospital explorer is not shown because the extract is invalid. Nothing was scored.</p>
          <ul>
            {loaded.errors.map((error) => (
              <li key={`${error.code}-${error.path}`}>
                [{error.code}] {error.path}: {error.message}
              </li>
            ))}
          </ul>
        </section>
      ) : !evidence.ok ? (
        <section className="extract-error" role="alert">
          <p>Evidence ledger failed validation. Research cases are withheld.</p>
        </section>
      ) : (
        <>
          <section id="hospitals" className="selector-section" aria-labelledby="selector-title">
            <h2 id="selector-title">Choose a hospital</h2>
            <p className="tiny">Search the current dataset by name or recorded location. Coverage is not comprehensive.</p>
            <HospitalSelector
              hospitals={catalog}
              selectedId={selectedHospitalId ?? selectedResearchId}
              onSelect={openHospital}
            />
          </section>
          <details className="secondary-explorer">
            <summary>Browse map and filters</summary>
            <HospitalExplorer hospitals={catalog} onOpen={openHospital} />
          </details>
        </>
      )}

      <section className="howto" id="about" aria-labelledby="about-title">
        <h2 id="about-title">About</h2>
        <p className="mission">Because we believe your ZIP code should not determine the quality of care you receive.</p>
        <p className="tiny">
          Community and county-access evidence stays visible as context for service continuity. It is not a hospital
          staffing measure and does not prove that a transaction improves or harms access unless a sourced record says
          so.
        </p>
        <ol className="howto-steps">
          <li>Choose a hospital from the current dataset.</li>
          <li>Read the guided financial brief and historical statements.</li>
          <li>Explore an illustrative revenue/expense scenario, then inspect evidence gaps.</li>
        </ol>
      </section>

      <section className="methodology" id="methodology">
        <h2>How it works</h2>
        <details>
          <summary>Financial definitions, scenarios, and Ask</summary>
          <ul>
            <li>CMS cost reports are historical financial observations, not forecasts or valuations.</li>
            <li>The experimental score measures defined financial concern indicators, not acquisition attractiveness.</li>
            <li>Patient-service expense pressure uses Less Total Operating Expense / Net Patient Revenue.</li>
            <li>Negative cash and negative liabilities are preserved. Missing values are not shown as zero.</li>
            <li>County shading is dataset hospital count, not averaged risk.</li>
            <li>Coordinates are pending unless a sourced latitude and longitude exist. No runtime geocoding.</li>
            <li>What-if scenarios are illustrative and do not change the historical score.</li>
            <li>PulseLine Ask retrieves facts in the browser. Questions are not sent to a remote inference service.</li>
            {loaded.missingEvidence.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </details>
        <FullScoringRubric />
      </section>

      {selected && selectedFacility ? (
        <HospitalWorkspace
          key={selectedFacility.hospitalId}
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
          catalog={catalog}
          onSelectReport={setSelectedReportId}
          onChangeHospital={openHospital}
          onClose={closeFacility}
        />
      ) : null}

      {selectedResearch ? (
        <HospitalWorkspace
          key={selectedResearch.hospitalId}
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
          catalog={catalog}
          onSelectReport={() => undefined}
          onChangeHospital={openHospital}
          onClose={closeResearch}
        />
      ) : null}
    </div>
  );
}
