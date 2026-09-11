import type { EvidenceObservation, StructuralEvent } from "../types.ts";
import { evidenceDate } from "./format.ts";

function categoryLabel(category: StructuralEvent["eventCategory"]): string {
  if (category === "property_transaction") return "Property transaction";
  if (category === "parent_bankruptcy") return "Parent bankruptcy";
  if (category === "parent_restructuring") return "Parent restructuring";
  return "Acquisition";
}

export function EventTimeline({
  events,
  emptyLabel,
}: {
  events: StructuralEvent[];
  emptyLabel: string;
}) {
  if (events.length === 0) {
    return <p className="muted small">{emptyLabel}</p>;
  }

  const groups = new Map<string, StructuralEvent[]>();
  for (const event of events) {
    const list = groups.get(event.eventGroup) ?? [];
    list.push(event);
    groups.set(event.eventGroup, list);
  }

  return (
    <ol className="timeline">
      {[...groups.entries()].map(([groupId, groupEvents]) => (
        <li key={groupId} className="timeline-group">
          {groupEvents[0]?.eventCategory === "acquisition" ? (
            <p className="tiny">Event group {groupId}: acquisition and rename share this group and are not counted twice.</p>
          ) : null}
          {groupEvents.map((event) => (
            <article key={event.eventId} className="timeline-card">
              <p className="label">{categoryLabel(event.eventCategory)}</p>
              <p>
                <strong>{event.eventSubtype.replaceAll("_", " ")}</strong>
                {event.scope === "property" ? " · property scope, not a verified provider CHOW" : ""}
                {event.eventStatus === "verified_parent_event" ? " · parent event, not a verified facility bankruptcy" : ""}
              </p>
              <dl className="meta-list">
                <div>
                  <dt>Effective date</dt>
                  <dd>{evidenceDate(event.effectiveDate, event.effectiveDatePrecision)}</dd>
                </div>
                <div>
                  <dt>Announcement date</dt>
                  <dd>{evidenceDate(event.announcementDate)}</dd>
                </div>
                <div>
                  <dt>Scope</dt>
                  <dd>{event.scope.replaceAll("_", " ")}</dd>
                </div>
                <div>
                  <dt>Verification</dt>
                  <dd>
                    {event.eventStatus.replaceAll("_", " ")} · identity {event.identityConfidence} · outcome{" "}
                    {event.verifiedOutcome ? "verified for this event type" : "not a verified facility outcome"}
                  </dd>
                </div>
              </dl>
              <p className="muted small">{event.notes}</p>
              <ul className="reason-list">
                {event.sources.map((source) => (
                  <li key={source.sourceId}>
                    <a href={source.url} target="_blank" rel="noreferrer">
                      {source.title}
                    </a>
                    <p className="tiny">
                      Publication: {evidenceDate(source.publicationDate, source.publicationPrecision)}. {source.eligibilityNote}
                    </p>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </li>
      ))}
    </ol>
  );
}

export function ContextObservations({
  observations,
  domain,
  title,
}: {
  observations: EvidenceObservation[];
  domain: EvidenceObservation["domain"];
  title: string;
}) {
  const rows = observations.filter((item) => item.domain === domain);
  return (
    <section>
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <p className="muted small">No {domain.replaceAll("_", " ")} observations in the current evidence ledger.</p>
      ) : (
        <ul className="reason-list">
          {rows.map((item) => (
            <li key={item.observationId}>
              <strong>{item.metric.replaceAll("_", " ")}</strong>: {item.value ?? "Unknown"} {item.unit}
              {item.reportingPeriod ? ` · ${item.reportingPeriod}` : ""}
              <p className="tiny">
                Scope {item.scope}. Historical feature eligible: {item.historicalFeatureEligible ? "yes" : "no"}.{" "}
                {item.limitations}
              </p>
              {item.sources.map((source) => (
                <p className="tiny" key={`${item.observationId}-${source.sourceId}`}>
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {source.title}
                  </a>
                  {item.sourcePage ? ` · page ${item.sourcePage}` : ""} · {source.eligibilityNote}
                </p>
              ))}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
