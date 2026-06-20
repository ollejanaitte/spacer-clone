export type SpacerReferenceData = {
  name: string;
  source: string;
  date: string;
  notes: string;
  parameters: Record<string, number>;
};

export type SpacerDisplacementRow = {
  case_id: string;
  node_id: string;
  ux: number;
  uy: number;
  uz: number;
  rx: number;
  ry: number;
  rz: number;
};

export type SpacerReactionRow = {
  case_id: string;
  node_id: string;
  fx: number;
  fy: number;
  fz: number;
  mx: number;
  my: number;
  mz: number;
};

export type SpacerMemberForceRow = {
  case_id: string;
  member_id: string;
  station_x: number;
  station_ratio: number;
  n: number;
  qy: number;
  qz: number;
  mx: number;
  my: number;
  mz: number;
};

export type SpacerComparisonResult = {
  model: string;
  type: "displacement" | "reaction" | "memberForce";
  nodeId?: string;
  memberId?: string;
  component: string;
  spacerValue: number;
  cloneValue: number;
  difference: number;
  errorRate: number;
  passed: boolean;
};

export function parseCsvLine(line: string): string[] {
  return line.split(",").map((cell) => cell.trim());
}

export function parseCsvNumber(value: string): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function parseSpacerDisplacements(csv: string): SpacerDisplacementRow[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  return lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    return {
      case_id: cols[0] ?? "",
      node_id: cols[1] ?? "",
      ux: parseCsvNumber(cols[2]),
      uy: parseCsvNumber(cols[3]),
      uz: parseCsvNumber(cols[4]),
      rx: parseCsvNumber(cols[5]),
      ry: parseCsvNumber(cols[6]),
      rz: parseCsvNumber(cols[7]),
    };
  });
}

export function parseSpacerReactions(csv: string): SpacerReactionRow[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  return lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    return {
      case_id: cols[0] ?? "",
      node_id: cols[1] ?? "",
      fx: parseCsvNumber(cols[2]),
      fy: parseCsvNumber(cols[3]),
      fz: parseCsvNumber(cols[4]),
      mx: parseCsvNumber(cols[5]),
      my: parseCsvNumber(cols[6]),
      mz: parseCsvNumber(cols[7]),
    };
  });
}

export function parseSpacerMemberForces(csv: string): SpacerMemberForceRow[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  return lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    return {
      case_id: cols[0] ?? "",
      member_id: cols[1] ?? "",
      station_x: parseCsvNumber(cols[2]),
      station_ratio: parseCsvNumber(cols[3]),
      n: parseCsvNumber(cols[4]),
      qy: parseCsvNumber(cols[5]),
      qz: parseCsvNumber(cols[6]),
      mx: parseCsvNumber(cols[7]),
      my: parseCsvNumber(cols[8]),
      mz: parseCsvNumber(cols[9]),
    };
  });
}

export function compareDisplacements(
  spacer: SpacerDisplacementRow[],
  clone: Array<{ nodeId: string; ux: number; uy: number; uz: number; rx: number; ry: number; rz: number }>,
  tolerance: { relative: number; absolute: number },
): SpacerComparisonResult[] {
  const results: SpacerComparisonResult[] = [];

  for (const sp of spacer) {
    const cl = clone.find((c) => c.nodeId === sp.node_id);
    if (!cl) continue;

    for (const component of ["ux", "uy", "uz", "rx", "ry", "rz"] as const) {
      const spacerVal = sp[component];
      const cloneVal = cl[component];
      const diff = cloneVal - spacerVal;
      const absSpacer = Math.abs(spacerVal);
      const errorRate = absSpacer > tolerance.absolute
        ? Math.abs(diff) / absSpacer
        : Math.abs(diff);
      results.push({
        model: "",
        type: "displacement",
        nodeId: sp.node_id,
        component,
        spacerValue: spacerVal,
        cloneValue: cloneVal,
        difference: diff,
        errorRate,
        passed: errorRate <= tolerance.relative || Math.abs(diff) <= tolerance.absolute,
      });
    }
  }

  return results;
}

export function compareReactions(
  spacer: SpacerReactionRow[],
  clone: Array<{ nodeId: string; fx: number; fy: number; fz: number; mx: number; my: number; mz: number }>,
  tolerance: { relative: number; absolute: number },
): SpacerComparisonResult[] {
  const results: SpacerComparisonResult[] = [];

  for (const sp of spacer) {
    const cl = clone.find((c) => c.nodeId === sp.node_id);
    if (!cl) continue;

    for (const component of ["fx", "fy", "fz", "mx", "my", "mz"] as const) {
      const spacerVal = sp[component];
      const cloneVal = cl[component];
      const diff = cloneVal - spacerVal;
      const absSpacer = Math.abs(spacerVal);
      const errorRate = absSpacer > tolerance.absolute
        ? Math.abs(diff) / absSpacer
        : Math.abs(diff);
      results.push({
        model: "",
        type: "reaction",
        nodeId: sp.node_id,
        component,
        spacerValue: spacerVal,
        cloneValue: cloneVal,
        difference: diff,
        errorRate,
        passed: errorRate <= tolerance.relative || Math.abs(diff) <= tolerance.absolute,
      });
    }
  }

  return results;
}
