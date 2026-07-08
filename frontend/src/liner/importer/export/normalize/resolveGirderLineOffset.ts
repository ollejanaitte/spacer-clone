import type { LinerBridge, GirderLineMaster } from "../../types";

function isCenterLine(line: GirderLineMaster): boolean {
  return line.role === "center" || line.label === "HCL";
}

/** Resolve transverse offset for a girder line: nominalOffset > section cumulativeWidth > lineIndex. */
export function resolveGirderLineOffset(
  line: GirderLineMaster,
  bridge: LinerBridge,
  lineIndex: number,
): number {
  if (isCenterLine(line)) {
    return 0;
  }

  if (line.nominalOffset != null && Number.isFinite(line.nominalOffset)) {
    return line.nominalOffset;
  }

  for (const section of bridge.sections) {
    const point = section.points.find((entry) => entry.girderLineId === line.id);
    const cumulativeWidth = point?.cumulativeWidth?.value;
    if (cumulativeWidth != null && Number.isFinite(cumulativeWidth)) {
      return cumulativeWidth;
    }
  }

  return lineIndex;
}
