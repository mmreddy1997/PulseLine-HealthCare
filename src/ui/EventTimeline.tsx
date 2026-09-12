import {
  eventCategoryLabel,
  eventRemainingQuestions,
  eventScopeLabel,
  eventVerificationLabel,
  unknownField,
  VERIFICATION_COPY,
  VERIFICATION_LIMIT,
} from "../../lib/diligence/events.ts";
import { EMPTY_EVENT_LEDGER } from "../../lib/diligence/gaps.ts";
import type { EvidenceObservation, StructuralEvent } from "../types.ts";
import { evidenceDate } from "./format.ts";

export function EventTimeline({
  events,
}: {
  events: StructuralEvent[];
}) {
  if (events.length === 0) {
    return <p className="muted small">{EMPTY_EVENT_LEDGER}</p>;
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
            <p className="tiny">Acquisition and rename share this group and are not two independent events.</p>
          ) : null}
          {groupEvents.map((event) => {
            const verification = eventVerificationLabel(event);
            const remaining = eventRemainingQuestions(event);
            return (
              <article key={event.eventId} className="timeline-card">
                <div className="timeline-head">
                  <time>{evidenceDate(event.effectiveDate, event.effectiveDatePrecision)}</time>
                  <span className="scope-badge">{eventScopeLabel(event)}</span>
                </div>
                <p>
                  <strong>{eventCategoryLabel(event)}</strong>
                  {` · ${event.eventSubtype.replaceAll("_", " ")}`}
                </p>
                <p className="tiny">
                  Announcement {evidenceDate(event.announcementDate)} · Date precision {event.effectiveDatePrecision}
                </p>
                <p className="tiny">
                  Buyer {unknownField(event.buyer)} · Seller {unknownField(event.seller)}
                </p>
                <p className={`verify-label verify-${verification}`}>{VERIFICATION_COPY[verification]}</p>
                <p className="tiny">{VERIFICATION_LIMIT}</p>
                <details>
                  <summary>Sources and remaining questions</summary>
                  <p className="tiny">{event.notes}</p>
                  <p className="tiny">
                    Event-time CCN {unknownField(event.ccnAtEvent)}. Outcome{" "}
                    {event.verifiedOutcome ? "verified for this event type" : "not a verified facility outcome"}.
                  </p>
                  <ul className="reason-list">
                    {event.sources.map((source) => (
                      <li key={source.sourceId}>
                        <a href={source.url} target="_blank" rel="noreferrer">
                          {source.title}
                        </a>
                        <p className="tiny">
                          Publication: {evidenceDate(source.publicationDate, source.publicationPrecision)}.{" "}
                          {source.eligibilityNote}
                        </p>
                      </li>
                    ))}
                  </ul>
                  {remaining.length > 0 ? (
                    <ul className="reason-list">
                      {remaining.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : null}
                </details>
              </article>
            );
          })}
        </li>
      ))}
    </ol>
  );
}

export function ContextObservations({
  observations,
  domain,
  title,
  contextNote,
}: {
  observations: EvidenceObservation[];
  domain: EvidenceObservation["domain"];
  title: string;
  contextNote?: string;
}) {
  const rows = observations.filter((item) => item.domain === domain);
  return (
    <section>
      <h3>{title}</h3>
      {contextNote ? <p className="tiny">{contextNote}</p> : null}
      {rows.length === 0 ? (
        <p className="muted small">
          No {domain.replaceAll("_", " ")} observations are attached in the current PulseLine ledger.
        </p>
      ) : (
        <ul className="reason-list">
          {rows.map((item) => (
            <li key={item.observationId}>
              <strong>{item.metric.replaceAll("_", " ")}</strong>: {item.value ?? "Unknown"} {item.unit}
              {item.reportingPeriod ? ` · ${item.reportingPeriod}` : ""}
              <details>
                <summary>Details</summary>
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
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
