import type { AnalysisResult } from "../types";

type ForceReportRow = {
  load_case: string;
  member_id: string;
  coordinate_system: string;
  i_fx: number;
  i_fy: number;
  i_fz: number;
  i_mx: number;
  i_my: number;
  i_mz: number;
  j_fx: number;
  j_fy: number;
  j_fz: number;
  j_mx: number;
  j_my: number;
  j_mz: number;
};

const FORCE_REPORT_HEADERS = [
  "load_case",
  "member_id",
  "coordinate_system",
  "i_fx",
  "i_fy",
  "i_fz",
  "i_mx",
  "i_my",
  "i_mz",
  "j_fx",
  "j_fy",
  "j_fz",
  "j_mx",
  "j_my",
  "j_mz",
] as const;

export function buildMemberForceReportCsv(result: AnalysisResult): string {
  const rows: ForceReportRow[] = [];

  for (const item of result.memberEndForces) {
    rows.push({
      load_case: item.loadCaseId,
      member_id: item.memberId,
      coordinate_system: item.coordinateSystem,
      i_fx: item.i.fx,
      i_fy: item.i.fy,
      i_fz: item.i.fz,
      i_mx: item.i.mx,
      i_my: item.i.my,
      i_mz: item.i.mz,
      j_fx: item.j.fx,
      j_fy: item.j.fy,
      j_fz: item.j.fz,
      j_mx: item.j.mx,
      j_my: item.j.my,
      j_mz: item.j.mz,
    });
  }

  const response = result.responseSpectrumResult;
  if (response) {
    for (const mode of response.modalResults) {
      const sectionForces = mode.memberSectionForces ?? [];
      const grouped = groupSectionForces(sectionForces);
      for (const [memberId, forces] of grouped) {
        rows.push(buildRowFromSectionForces(`Mode ${mode.modeNo}`, memberId, forces));
      }
    }
    const combinedForces = response.combinedResult.memberSectionForces ?? [];
    const grouped = groupSectionForces(combinedForces);
    for (const [memberId, forces] of grouped) {
      rows.push(buildRowFromSectionForces(response.combinedResult.method, memberId, forces));
    }
  }

  return writeForceCsv(FORCE_REPORT_HEADERS, rows);
}

function groupSectionForces(
  forces: Array<{ memberId: string; station: number; component: string; value: number }>,
): Map<string, Map<string, { i: number; j: number }>> {
  const grouped = new Map<string, Map<string, { i: number; j: number }>>();
  for (const force of forces) {
    if (!grouped.has(force.memberId)) {
      grouped.set(force.memberId, new Map());
    }
    const compMap = grouped.get(force.memberId)!;
    const existing = compMap.get(force.component) ?? { i: 0, j: 0 };
    if (force.station === 0) {
      existing.i = force.value;
    } else {
      existing.j = force.value;
    }
    compMap.set(force.component, existing);
  }
  return grouped;
}

function buildRowFromSectionForces(
  caseId: string,
  memberId: string,
  forces: Map<string, { i: number; j: number }>,
): ForceReportRow {
  const get = (comp: string) => forces.get(comp) ?? { i: 0, j: 0 };
  const n = get("N");
  const qy = get("Qy");
  const qz = get("Qz");
  const mx = get("Mx");
  const my = get("My");
  const mz = get("Mz");
  return {
    load_case: caseId,
    member_id: memberId,
    coordinate_system: "local",
    i_fx: n.i,
    i_fy: qy.i,
    i_fz: qz.i,
    i_mx: mx.i,
    i_my: my.i,
    i_mz: mz.i,
    j_fx: n.j,
    j_fy: qy.j,
    j_fz: qz.j,
    j_mx: mx.j,
    j_my: my.j,
    j_mz: mz.j,
  };
}

function writeForceCsv(
  headers: readonly string[],
  rows: ForceReportRow[],
): string {
  return [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((header) => {
        const value = row[header as keyof ForceReportRow];
        if (typeof value === "number") {
          if (!Number.isFinite(value)) return "";
          return String(value);
        }
        if (!/[",\r\n]/.test(value)) return value;
        return `"${value.replace(/"/g, '""')}"`;
      }).join(","),
    ),
  ].join("\r\n") + "\r\n";
}
