import { EXPERIMENTAL_NOTE, type PulseAnswer } from "./types.ts";

export interface ExportAnswer {
  question: string;
  statement: string;
  hospitalName: string;
  periodLabel: string | null;
  sources: { label: string; url: string | null; reportId: string | null }[];
  limitations: string[];
  kind: PulseAnswer["kind"];
}

export interface ExportDocument {
  hospitalName: string;
  exportedAt: string;
  experimentalNote: string;
  answers: ExportAnswer[];
}

export type ExportResult =
  | { ok: true; document: ExportDocument }
  | { ok: false; reason: "empty" | "incomplete" };

export function canExportAnswer(answer: PulseAnswer): boolean {
  return answer.status === "complete";
}

export function buildExportDocument(
  hospitalName: string,
  answers: PulseAnswer[],
  now = new Date(),
): ExportResult {
  if (answers.length === 0) return { ok: false, reason: "empty" };
  if (answers.some((answer) => !canExportAnswer(answer))) return { ok: false, reason: "incomplete" };
  return {
    ok: true,
    document: {
      hospitalName,
      exportedAt: now.toISOString().slice(0, 10),
      experimentalNote: EXPERIMENTAL_NOTE,
      answers: answers.map((answer) => ({
        question: answer.question,
        statement: answer.statement,
        hospitalName: answer.hospitalName,
        periodLabel: answer.periodLabel,
        sources: answer.sources,
        limitations: answer.limitations,
        kind: answer.kind,
      })),
    },
  };
}

export function formatAnswerText(answer: PulseAnswer): string {
  const sources = answer.sources
    .map((source) => {
      const report = source.reportId ? ` (report ${source.reportId})` : "";
      const url = source.url ? ` ${source.url}` : "";
      return `${source.label}${report}${url}`;
    })
    .join("\n");
  return [
    `Hospital: ${answer.hospitalName}`,
    answer.periodLabel ? `Period: ${answer.periodLabel}` : null,
    `Question: ${answer.question}`,
    `Answer: ${answer.statement}`,
    `Kind: ${answer.kind.replaceAll("_", " ")}`,
    sources ? `Sources:\n${sources}` : null,
    answer.limitations.length ? `Limitations:\n${answer.limitations.join("\n")}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}
