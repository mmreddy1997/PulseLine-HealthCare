import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import evidencePack from "../../research/PulseLine_expanded_evidence_v1.json";
import researchPack from "../../research/PulseLine_three_hospital_data.json";
import { adaptEvidencePack, eventsForHospital, observationsForHospital } from "../../lib/adapt-evidence.ts";
import { researchAskContext, scoredAskContext, type PulseAnswer } from "../../lib/ask/index.ts";
import { buildExplorerCatalog } from "../../lib/explorer/index.ts";
import { loadResearchDashboard } from "../../lib/pipeline.ts";
import { AboutPulseLine } from "./about/AboutPulseLine.tsx";
import { HospitalExplorer } from "./explorer/HospitalExplorer.tsx";
import { HospitalWorkspace } from "./HospitalWorkspace.tsx";
import { SiteHeader } from "./SiteHeader.tsx";

export function App() {
  const loaded = useMemo(() => loadResearchDashboard(researchPack), []);
  const evidence = useMemo(() => adaptEvidencePack(evidencePack), []);
  const [page, setPage] = useState<"explore" | "about">(() =>
    window.location.hash.startsWith("#about") ? "about" : "explore",
  );
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedResearchId, setSelectedResearchId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Record<string, PulseAnswer[]>>({});
  const [selectedByHospital, setSelectedByHospital] = useState<Record<string, string[]>>({});
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function syncPageFromHash() {
      const hash = window.location.hash;
      if (hash.startsWith("#about")) setPage("about");
      else if (hash === "#hospitals" || hash === "") setPage("explore");
    }
    window.addEventListener("hashchange", syncPageFromHash);
    return () => window.removeEventListener("hashchange", syncPageFromHash);
  }, []);

  const researchCases = useMemo(
    () => evidence.ledger?.hospitals.filter((hospital) => hospital.financialCoverage === "pending") ?? [],
    [evidence.ledger],
  );
  const catalog = useMemo(
    () => buildExplorerCatalog(loaded.ok ? loaded.facilities : [], researchCases, evidence.ledger?.events ?? []),
    [loaded, researchCases, evidence.ledger],
  );
  const snapshots = useMemo(() => {
    const next: Record<string, { netPatientRevenue: number | null; expenses: number | null; cash: number | null }> = {};
    if (loaded.ok) {
      for (const facility of loaded.facilities) {
        const financials = facility.latest.hospital.financials;
        next[facility.hospitalId] = {
          netPatientRevenue: financials.netPatientRevenue,
          expenses: financials.operatingExpenses,
          cash: financials.cash,
        };
      }
    }
    return next;
  }, [loaded]);
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

  const rememberOpener = () => {
    const active = document.activeElement;
    openerRef.current = active instanceof HTMLElement ? active : null;
  };
  const restoreOpener = () => {
    const opener = openerRef.current;
    openerRef.current = null;
    window.requestAnimationFrame(() => {
      if (opener?.isConnected) opener.focus();
    });
  };

  const openHospital = useCallback((hospitalId: string) => {
    rememberOpener();
    const facility = loaded.facilities.find((item) => item.hospitalId === hospitalId);
    if (facility) {
      setSelectedResearchId(null);
      setSelectedHospitalId(facility.hospitalId);
      setSelectedReportId(facility.latest.hospital.id);
      window.requestAnimationFrame(() => {
        document.getElementById("hospital-financials")?.scrollIntoView({ behavior: prefersSmooth() ? "smooth" : "auto", block: "start" });
      });
      return;
    }
    const research = researchCases.find((item) => item.hospitalId === hospitalId);
    if (research) {
      setSelectedHospitalId(null);
      setSelectedReportId(null);
      setSelectedResearchId(research.hospitalId);
      window.requestAnimationFrame(() => {
        document.getElementById("hospital-financials")?.scrollIntoView({ behavior: prefersSmooth() ? "smooth" : "auto", block: "start" });
      });
    }
  }, [loaded.facilities, researchCases]);

  const closeFacility = useCallback(() => {
    setSelectedHospitalId(null);
    setSelectedReportId(null);
    restoreOpener();
  }, []);
  const closeResearch = useCallback(() => {
    setSelectedResearchId(null);
    restoreOpener();
  }, []);

  return (
    <div className="page">
      <SiteHeader
        page={page}
        onExplore={() => {
          setPage("explore");
          window.location.hash = "hospitals";
        }}
        onAbout={() => {
          setPage("about");
          window.location.hash = "about";
        }}
      />

      {page === "about" ? (
        <AboutPulseLine hospitalView={selected} />
      ) : !loaded.ok ? (
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
          <HospitalExplorer
            hospitals={catalog}
            snapshots={snapshots}
            selectedId={selectedHospitalId ?? selectedResearchId}
            onViewFinancials={openHospital}
          />

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
              onSelectReport={setSelectedReportId}
              onClose={closeFacility}
              onOpenAbout={() => {
                setPage("about");
                window.location.hash = "about-scoring";
              }}
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
              onSelectReport={() => undefined}
              onClose={closeResearch}
              onOpenAbout={() => {
                setPage("about");
                window.location.hash = "about-scoring";
              }}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

function prefersSmooth(): boolean {
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
