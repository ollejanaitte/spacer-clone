import { useCallback, useMemo, useState } from "react";
import type { Bridge, JipLinerImporterProject, Section } from "../types";
import {
  addSection,
  bulkCreateSectionsByPdfPages,
  buildSectionListSummaries,
  duplicatePreviousSection,
  removeSection,
  type SectionListRowSummary,
} from "./sectionListService";

export function useSectionListEditor(initialBridge: Bridge) {
  const [draft, setDraft] = useState<Bridge>(initialBridge);

  const resetDraft = useCallback((bridge: Bridge) => {
    setDraft(bridge);
  }, []);

  const summaries = useMemo<SectionListRowSummary[]>(
    () => buildSectionListSummaries(draft),
    [draft],
  );

  const handleAddSection = useCallback(() => {
    setDraft((current) => addSection(current));
  }, []);

  const handleRemoveSection = useCallback((sectionId: string) => {
    setDraft((current) => removeSection(current, sectionId));
  }, []);

  const handleDuplicateSection = useCallback((sectionId: string) => {
    setDraft((current) => duplicatePreviousSection(current, sectionId));
  }, []);

  const handleBulkCreate = useCallback((startPage: number, endPage: number) => {
    setDraft((current) => bulkCreateSectionsByPdfPages(current, startPage, endPage));
  }, []);

  const replaceSections = useCallback((sections: Section[]) => {
    setDraft((current) => ({ ...current, sections }));
  }, []);

  return {
    draft,
    summaries,
    resetDraft,
    addSection: handleAddSection,
    removeSection: handleRemoveSection,
    duplicateSection: handleDuplicateSection,
    bulkCreateByPdfPages: handleBulkCreate,
    replaceSections,
  };
}

export function mergeBridgeIntoProject(
  project: JipLinerImporterProject,
  bridgeId: string,
  bridge: Bridge,
): JipLinerImporterProject {
  return {
    ...project,
    bridges: project.bridges.map((entry) => (entry.id === bridgeId ? bridge : entry)),
  };
}

export function formatRenderabilityBadge(status: string): string {
  switch (status) {
    case "ok":
      return "✓";
    case "partial":
      return "⚠";
    default:
      return "✗";
  }
}

export function formatDiagnosticsBadge(errorCount: number, warningCount: number): string {
  if (errorCount > 0) {
    return `Error ${errorCount}`;
  }
  if (warningCount > 0) {
    return `Warning ${warningCount}`;
  }
  return "-";
}
