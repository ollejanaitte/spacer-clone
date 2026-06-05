import type {
  AnalysisResult,
  EndForce,
  MemberSectionForceComponent,
  MemberSectionForceResult,
  NodeDisplacementResult,
  NodeReactionResult,
  ResultExports,
} from "../types";

const displacementHeaders = ["case_id", "node_id", "ux", "uy", "uz", "rx", "ry", "rz"] as const;
const reactionHeaders = ["case_id", "node_id", "fx", "fy", "fz", "mx", "my", "mz"] as const;
const memberForceHeaders = [
  "case_id",
  "member_id",
  "station_x",
  "station_ratio",
  "n",
  "qy",
  "qz",
  "mx",
  "my",
  "mz",
] as const;

type CsvRow = Record<string, string | number>;

export function buildResultCsvExports(result: AnalysisResult): ResultExports {
  return {
    "result.json": `${JSON.stringify(result, null, 2)}\n`,
    "displacements.csv": writeCsv(displacementHeaders, collectDisplacements(result)),
    "reactions.csv": writeCsv(reactionHeaders, collectReactions(result)),
    "member_section_forces.csv": writeCsv(memberForceHeaders, collectMemberSectionForces(result)),
  };
}

function collectDisplacements(result: AnalysisResult): CsvRow[] {
  const rows = result.displacements.map((item) => displacementRow(item.loadCaseId, item));
  for (const mode of result.eigenResult?.modes ?? []) {
    rows.push(...mode.shape.map((item) => displacementRow(`Mode ${mode.modeNo}`, item)));
  }
  const response = result.responseSpectrumResult;
  if (response) {
    for (const mode of response.modalResults) {
      rows.push(...mode.displacements.map((item) => displacementRow(`Mode ${mode.modeNo}`, item)));
    }
    rows.push(...response.combinedResult.displacements.map((item) => displacementRow(response.combinedResult.method, item)));
  }
  return rows;
}

function collectReactions(result: AnalysisResult): CsvRow[] {
  const rows = result.reactions.map((item) => reactionRow(item.loadCaseId, item));
  const response = result.responseSpectrumResult;
  if (response) {
    for (const mode of response.modalResults) {
      rows.push(...(mode.reactions ?? []).map((item) => reactionRow(`Mode ${mode.modeNo}`, item)));
    }
    rows.push(...(response.combinedResult.reactions ?? []).map((item) => reactionRow(response.combinedResult.method, item)));
  }
  return rows;
}

function collectMemberSectionForces(result: AnalysisResult): CsvRow[] {
  const rows = result.memberEndForces.flatMap((item) => [
    memberEndForceRow(item.loadCaseId, item.memberId, 0, item.i),
    memberEndForceRow(item.loadCaseId, item.memberId, 1, item.j),
  ]);
  const response = result.responseSpectrumResult;
  if (response) {
    for (const mode of response.modalResults) {
      rows.push(...sectionForceRows(`Mode ${mode.modeNo}`, mode.memberSectionForces ?? []));
    }
    rows.push(...sectionForceRows(response.combinedResult.method, response.combinedResult.memberSectionForces ?? []));
  }
  return rows;
}

function displacementRow(caseId: string, item: NodeDisplacementResult): CsvRow {
  return {
    case_id: caseId,
    node_id: item.nodeId,
    ux: item.ux,
    uy: item.uy,
    uz: item.uz,
    rx: item.rx,
    ry: item.ry,
    rz: item.rz,
  };
}

function reactionRow(caseId: string, item: NodeReactionResult): CsvRow {
  return {
    case_id: caseId,
    node_id: item.nodeId,
    fx: item.fx,
    fy: item.fy,
    fz: item.fz,
    mx: item.mx,
    my: item.my,
    mz: item.mz,
  };
}

function memberEndForceRow(caseId: string, memberId: string, station: number, force: EndForce): CsvRow {
  return {
    case_id: caseId,
    member_id: memberId,
    station_x: station,
    station_ratio: station,
    n: force.fx,
    qy: force.fy,
    qz: force.fz,
    mx: force.mx,
    my: force.my,
    mz: force.mz,
  };
}

function sectionForceRows(caseId: string, items: MemberSectionForceResult[]): CsvRow[] {
  const rows = new Map<string, CsvRow>();
  for (const item of items) {
    const key = `${item.memberId}:${item.station}`;
    const row =
      rows.get(key) ??
      ({
        case_id: caseId,
        member_id: item.memberId,
        station_x: item.station,
        station_ratio: item.station,
        n: "",
        qy: "",
        qz: "",
        mx: "",
        my: "",
        mz: "",
      } satisfies CsvRow);
    row[componentColumn(item.component)] = item.value;
    rows.set(key, row);
  }
  return [...rows.values()];
}

function componentColumn(component: MemberSectionForceComponent): string {
  const columns: Record<MemberSectionForceComponent, string> = {
    N: "n",
    Qy: "qy",
    Qz: "qz",
    Mx: "mx",
    My: "my",
    Mz: "mz",
  };
  return columns[component];
}

function writeCsv(headers: readonly string[], rows: CsvRow[]): string {
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvValue(row[header] ?? "")).join(",")),
  ].join("\r\n") + "\r\n";
}

function csvValue(value: string | number): string {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("CSV value contains NaN or Infinity.");
    return String(value);
  }
  if (!/[",\r\n]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}
