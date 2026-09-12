import { GAP_KIND_LABELS, type DiligenceGap, type GapKind } from "../../../lib/diligence/gaps.ts";

export function GapList({ gaps }: { gaps: DiligenceGap[] }) {
  const groups = (Object.keys(GAP_KIND_LABELS) as GapKind[]).map((kind) => ({
    kind,
    items: gaps.filter((gap) => gap.kind === kind),
  }));
  return (
    <div className="gap-list">
      {groups.map((group) =>
        group.items.length === 0 ? null : (
          <section key={group.kind}>
            <h4>{GAP_KIND_LABELS[group.kind]}</h4>
            <ul className="reason-list">
              {group.items.map((gap) => (
                <li key={gap.id}>
                  <strong>{gap.label}</strong>
                  <p className="tiny">{gap.detail}</p>
                </li>
              ))}
            </ul>
          </section>
        ),
      )}
    </div>
  );
}
