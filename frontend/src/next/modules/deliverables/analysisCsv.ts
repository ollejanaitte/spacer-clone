/**
 * AN-05 analysis CSV export (Phase 11 P0-04 · AN-05).
 *
 * Pure builders converting an authoritative IF3 result into CSV files.
 * Fail-closed: only called when the IF3 result is authoritative.
 */

import type { FrameAnalysisResultResource } from "../../../contracts/frameAnalysisResultResource";
import { extractLinearStaticResultFromIf3 } from "../analysis/resultAdapter";

export interface AnalysisCsvFile {
  readonly fileName: string;
  readonly content: string;
}

function csvEscape(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function toCsv(headers: readonly string[], rows: readonly (readonly (string | number | undefined)[])[]): string {
  const header = headers.join(",");
  const data = rows
    .map((row) => row.map((v) => csvEscape(v === undefined || v === null ? "" : String(v))).join(","))
    .join("\n");
  return `${header}\n${data}\n`;
}

export function buildAnalysisCsvExports(if3Result: FrameAnalysisResultResource): AnalysisCsvFile[] {
  const view = extractLinearStaticResultFromIf3(if3Result);
  const files: AnalysisCsvFile[] = [];

  files.push({
    fileName: "displacements.csv",
    content: toCsv(
      ["case_id", "node_id", "ux", "uy", "uz"],
      view.displacements.map((d) => [d.loadCaseId, d.nodeId, d.ux, d.uy, d.uz]),
    ),
  });
  files.push({
    fileName: "reactions.csv",
    content: toCsv(
      ["case_id", "node_id", "fx", "fy", "fz"],
      view.reactions.map((r) => [r.loadCaseId, r.nodeId, r.fx, r.fy, r.fz]),
    ),
  });
  const memberRows: (readonly (string | number | undefined)[])[] = [];
  for (const m of view.memberForces) {
    memberRows.push([m.loadCaseId, m.memberId, "i", m.i.fx, m.i.fy, m.i.fz, m.i.mx, m.i.my, m.i.mz]);
    memberRows.push([m.loadCaseId, m.memberId, "j", m.j.fx, m.j.fy, m.j.fz, m.j.mx, m.j.my, m.j.mz]);
  }
  files.push({
    fileName: "member_section_forces.csv",
    content: toCsv(
      ["case_id", "member_id", "end", "fx", "fy", "fz", "mx", "my", "mz"],
      memberRows,
    ),
  });
  return files;
}
