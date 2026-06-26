import type { GridPointPreparation } from "../core/types";

function padIndex(index: number): string {
  return index.toString().padStart(3, "0");
}

export function frameNodeId(
  linerModelId: string,
  longitudinalIndex: number,
  transverseIndex: number,
): string {
  return `N_LINER_${linerModelId}_${padIndex(longitudinalIndex)}_${padIndex(transverseIndex)}`;
}

export function frameMemberId(
  linerModelId: string,
  direction: "L" | "T",
  longitudinalIndex: number,
  transverseIndex: number,
): string {
  return `M_LINER_${linerModelId}_${direction}_${padIndex(longitudinalIndex)}_${padIndex(transverseIndex)}`;
}

export function frameSupportId(
  linerModelId: string,
  templateId: string,
  nodeId: string,
): string {
  return `S_LINER_${linerModelId}_${templateId}_${nodeId}`;
}

export function frameNodeIdForGridPoint(point: GridPointPreparation): string {
  return frameNodeId(
    point.id.split("-")[1] ?? "unknown",
    point.labels.longitudinalIndex,
    point.labels.transverseIndex,
  );
}
