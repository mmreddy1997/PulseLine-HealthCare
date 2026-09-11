import { useEffect, useRef } from "react";
import type { EvidenceHospital, EvidenceObservation, StructuralEvent } from "../types.ts";
import { ContextObservations, EventTimeline } from "./EventTimeline.tsx";
import { cycleFocus } from "./focus.ts";

export function ResearchCaseDrawer({
  hospital,
  events,
  observations,
  onClose,
}: {
  hospital: EvidenceHospital;
  events: StructuralEvent[];
  observations: EvidenceObservation[];
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

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
      if (event.key === "Tab" && panel) {
        cycleFocus(panel, event);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [hospital.hospitalId]);

  return (
    <div className="drawer-layer">
      <div className="drawer-backdrop" onClick={onClose} />
      <aside ref={panelRef} className="drawer" role="dialog" aria-modal="true" aria-labelledby="research-drawer-title">
        <header className="drawer-header">
          <p className="eyebrow">Research case · financial data pending</p>
          <h2 id="research-drawer-title">{hospital.name}</h2>
          <p className="muted">
            {hospital.city} · {hospital.hospitalId}
          </p>
          <p className="tiny">
            CCN at event: {hospital.ccnAtEvent ?? "unknown · not invented"} · provider CHOW: {hospital.providerChow} ·
            identity {hospital.identityStatus.replaceAll("_", " ")}
          </p>
          <button type="button" className="close-btn" ref={closeRef} onClick={onClose}>
            Close
          </button>
        </header>

        <section>
          <h3>Financial data pending</h3>
          <p className="status-pill status-pending">Financial data pending</p>
          <p className="muted small">
            No CCN, Kentucky license ID, cost-report financials, or stress score were invented for this case.
          </p>
        </section>

        <section>
          <h3>Structural events</h3>
          <EventTimeline events={events} emptyLabel="No structural events are attached to this research case." />
        </section>

        <ContextObservations observations={observations} domain="operational" title="Hospital pressure context" />
        <ContextObservations observations={observations} domain="community" title="Community context" />
        <ContextObservations observations={observations} domain="workforce_access" title="County access context" />
      </aside>
    </div>
  );
}
