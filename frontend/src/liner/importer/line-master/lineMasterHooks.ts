import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  Bridge,
  GirderLineMaster,
  GirderLineReferenceMode,
  GirderLineRole,
  GirderLineSet,
  JipLinerImporterProject,
  Span,
} from "../types";

export const REFERENCE_MODE_OPTIONS: Array<{
  value: GirderLineReferenceMode;
  label: string;
}> = [
  { value: "pdf-row-master", label: "PDF行を橋軸線マスタにする" },
  { value: "centerline-offset", label: "中心線オフセット" },
  { value: "absolute-coordinate", label: "絶対座標" },
];

export const GIRDER_LINE_ROLE_OPTIONS: Array<{
  value: GirderLineRole;
  label: string;
}> = [
  { value: "center", label: "center" },
  { value: "girder", label: "girder" },
  { value: "edge", label: "edge" },
  { value: "barrier", label: "barrier" },
  { value: "custom", label: "custom" },
];

function createUniqueId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function inferRoleFromLabel(label: string): GirderLineRole {
  const normalized = label.trim().toUpperCase();
  if (normalized === "CL" || normalized === "HCL") {
    return "center";
  }
  if (/^G\d/.test(normalized) || normalized.startsWith("G")) {
    return "girder";
  }
  if (/^HL\d/.test(normalized) || normalized.startsWith("HL")) {
    return "edge";
  }
  return "custom";
}

export function parseCsvLineLabels(text: string): string[] {
  return text
    .split(/\r?\n/)
    .flatMap((line) => line.split(/[,;\t]/))
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function linesFromCsvText(text: string, startOrder = 0): GirderLineMaster[] {
  const labels = parseCsvLineLabels(text);
  return labels.map((label, index) => ({
    id: createUniqueId("girder-line"),
    label,
    role: inferRoleFromLabel(label),
    displayOrder: startOrder + index,
  }));
}

export function createEmptyLine(displayOrder: number): GirderLineMaster {
  return {
    id: createUniqueId("girder-line"),
    label: "",
    role: "girder",
    displayOrder,
  };
}

export function normalizeDisplayOrder(lines: GirderLineMaster[]): GirderLineMaster[] {
  return [...lines]
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .map((line, index) => ({
      ...line,
      displayOrder: index,
    }));
}

export function moveLine(lines: GirderLineMaster[], lineId: string, direction: "up" | "down"): GirderLineMaster[] {
  const ordered = normalizeDisplayOrder(lines);
  const index = ordered.findIndex((line) => line.id === lineId);
  if (index < 0) {
    return ordered;
  }

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= ordered.length) {
    return ordered;
  }

  const next = [...ordered];
  [next[index], next[targetIndex]] = [next[targetIndex]!, next[index]!];
  return next.map((line, orderIndex) => ({
    ...line,
    displayOrder: orderIndex,
  }));
}

export function cloneGirderLineSetWithNewIds(source: GirderLineSet): GirderLineSet {
  return {
    name: source.name,
    referenceMode: source.referenceMode,
    appliesToSpanIds: [...source.appliesToSpanIds],
    id: createUniqueId("girder-line-set"),
    lines: normalizeDisplayOrder(source.lines).map((line) => ({
      ...line,
      id: createUniqueId("girder-line"),
    })),
  };
}

export function createDefaultGirderLineSet(spans: Span[]): GirderLineSet {
  return {
    id: createUniqueId("girder-line-set"),
    name: "CL",
    referenceMode: "pdf-row-master",
    appliesToSpanIds: spans.map((span) => span.id),
    lines: [],
  };
}

export function resolvePrimaryGirderLineSet(bridge: Bridge): GirderLineSet {
  if (bridge.girderLineSets.length > 0) {
    return {
      ...bridge.girderLineSets[0]!,
      lines: normalizeDisplayOrder(bridge.girderLineSets[0]!.lines),
    };
  }
  return createDefaultGirderLineSet(bridge.spans);
}

export function formatSpanLabels(spans: Span[], spanIds: string[]): string {
  if (spanIds.length === 0) {
    return "-";
  }
  const labels = spanIds
    .map((spanId) => spans.find((span) => span.id === spanId)?.name ?? spanId)
    .filter((label) => label.length > 0);
  return labels.length > 0 ? labels.join(", ") : "-";
}

export type LineMasterDraft = {
  girderLineSet: GirderLineSet;
  dirty: boolean;
};

export function useLineMasterEditor(initialSet: GirderLineSet) {
  const [draft, setDraft] = useState<GirderLineSet>(() => ({
    ...initialSet,
    lines: normalizeDisplayOrder(initialSet.lines),
  }));

  useEffect(() => {
    setDraft({
      ...initialSet,
      lines: normalizeDisplayOrder(initialSet.lines),
    });
  }, [initialSet]);

  const orderedLines = useMemo(
    () => normalizeDisplayOrder(draft.lines),
    [draft.lines],
  );

  const setName = useCallback((name: string) => {
    setDraft((current) => ({ ...current, name }));
  }, []);

  const setReferenceMode = useCallback((referenceMode: GirderLineReferenceMode) => {
    setDraft((current) => ({ ...current, referenceMode }));
  }, []);

  const setAppliesToSpanIds = useCallback((appliesToSpanIds: string[]) => {
    setDraft((current) => ({ ...current, appliesToSpanIds }));
  }, []);

  const updateLine = useCallback((lineId: string, patch: Partial<GirderLineMaster>) => {
    setDraft((current) => ({
      ...current,
      lines: current.lines.map((line) =>
        line.id === lineId ? { ...line, ...patch } : line,
      ),
    }));
  }, []);

  const addLine = useCallback(() => {
    setDraft((current) => {
      const nextOrder = normalizeDisplayOrder(current.lines).length;
      return {
        ...current,
        lines: [...current.lines, createEmptyLine(nextOrder)],
      };
    });
  }, []);

  const removeLine = useCallback((lineId: string) => {
    setDraft((current) => ({
      ...current,
      lines: normalizeDisplayOrder(current.lines.filter((line) => line.id !== lineId)),
    }));
  }, []);

  const reorderLine = useCallback((lineId: string, direction: "up" | "down") => {
    setDraft((current) => ({
      ...current,
      lines: moveLine(current.lines, lineId, direction),
    }));
  }, []);

  const importCsv = useCallback((text: string) => {
    setDraft((current) => {
      const startOrder = normalizeDisplayOrder(current.lines).length;
      const imported = linesFromCsvText(text, startOrder);
      return {
        ...current,
        lines: normalizeDisplayOrder([...current.lines, ...imported]),
      };
    });
  }, []);

  const replaceFromSet = useCallback((source: GirderLineSet) => {
    setDraft(cloneGirderLineSetWithNewIds(source));
  }, []);

  const resetDraft = useCallback((nextSet: GirderLineSet) => {
    setDraft({
      ...nextSet,
      lines: normalizeDisplayOrder(nextSet.lines),
    });
  }, []);

  return {
    draft,
    orderedLines,
    setName,
    setReferenceMode,
    setAppliesToSpanIds,
    updateLine,
    addLine,
    removeLine,
    reorderLine,
    importCsv,
    replaceFromSet,
    resetDraft,
  };
}

export function findCopySourceBridge(
  project: JipLinerImporterProject,
  targetBridgeId: string,
): Bridge | null {
  const targetIndex = project.bridges.findIndex((bridge) => bridge.id === targetBridgeId);
  if (targetIndex <= 0) {
    return null;
  }

  for (let index = targetIndex - 1; index >= 0; index -= 1) {
    const candidate = project.bridges[index];
    if (candidate && candidate.girderLineSets.length > 0) {
      return candidate;
    }
  }

  return null;
}

export function mergeGirderLineSetIntoBridge(
  bridge: Bridge,
  girderLineSet: GirderLineSet,
): Bridge {
  const existingIndex = bridge.girderLineSets.findIndex((set) => set.id === girderLineSet.id);
  const nextSets =
    existingIndex >= 0
      ? bridge.girderLineSets.map((set, index) =>
          index === existingIndex ? girderLineSet : set,
        )
      : [...bridge.girderLineSets, girderLineSet];

  return {
    ...bridge,
    girderLineSets: nextSets,
  };
}

export function updateLatestSnapshotMeta(
  project: JipLinerImporterProject,
  bridgeId: string,
): JipLinerImporterProject {
  const snapshots = project.savedSnapshots ?? [];
  if (snapshots.length === 0) {
    return project;
  }

  const latestIndex = snapshots.length - 1;
  const latest = snapshots[latestIndex]!;
  const nextSnapshots = snapshots.map((snapshot, index) =>
    index === latestIndex
      ? {
          ...snapshot,
          lastEditedStep: "lineMaster" as const,
          lastEditedRef: {
            ...snapshot.lastEditedRef,
            bridgeId,
          },
        }
      : snapshot,
  );

  return {
    ...project,
    savedSnapshots: nextSnapshots,
  };
}
