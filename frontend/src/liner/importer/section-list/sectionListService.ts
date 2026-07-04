import type { Bridge, Section } from "../types";
import { evaluateSectionRenderability } from "../renderability";
import { validateSection, summarizeDiagnostics } from "../diagnostics/validateImporter";
import {
  calculateSectionInputRate,
  cloneSection,
  createEmptySection,
  createUniqueId,
  sortSectionsByPdfPage,
} from "../utils/importerUtils";
import { resolvePrimaryGirderLineSet } from "../line-master/lineMasterHooks";

export type SectionListRowSummary = {
  section: Section;
  inputRate: number;
  renderabilityStatus: string;
  errorCount: number;
  warningCount: number;
};

export function buildSectionListSummaries(bridge: Bridge): SectionListRowSummary[] {
  return sortSectionsByPdfPage(bridge.sections).map((section) => {
    const diagnostics = validateSection(section, bridge, bridge.sections);
    const summary = summarizeDiagnostics(diagnostics);
    const renderability = evaluateSectionRenderability(section);

    return {
      section: {
        ...section,
        diagnostics: {
          items: diagnostics,
          lastCalculatedAt: new Date().toISOString(),
        },
        renderability,
      },
      inputRate: calculateSectionInputRate(section),
      renderabilityStatus: renderability.crossSection,
      errorCount: summary.errorCount,
      warningCount: summary.warningCount,
    };
  });
}

export function addSection(bridge: Bridge, pdfPage?: number): Bridge {
  const girderSet = resolvePrimaryGirderLineSet(bridge);
  const lines = girderSet?.lines ?? [];
  const nextPage =
    pdfPage ??
    (bridge.sections.length === 0
      ? 1
      : Math.max(...bridge.sections.map((section) => section.pdfPage)) + 1);

  const section = createEmptySection(bridge.id, nextPage, lines);
  return {
    ...bridge,
    sections: [...bridge.sections, section],
  };
}

export function removeSection(bridge: Bridge, sectionId: string): Bridge {
  return {
    ...bridge,
    sections: bridge.sections.filter((section) => section.id !== sectionId),
  };
}

export function duplicatePreviousSection(bridge: Bridge, sectionId?: string): Bridge {
  const ordered = sortSectionsByPdfPage(bridge.sections);
  if (ordered.length === 0) {
    return addSection(bridge);
  }

  const source =
    sectionId != null
      ? ordered.find((section) => section.id === sectionId) ?? ordered[ordered.length - 1]!
      : ordered[ordered.length - 1]!;

  const nextPage = Math.max(...bridge.sections.map((section) => section.pdfPage)) + 1;
  const cloned = cloneSection(source, nextPage);

  return {
    ...bridge,
    sections: [...bridge.sections, cloned],
  };
}

export function bulkCreateSectionsByPdfPages(
  bridge: Bridge,
  startPage: number,
  endPage: number,
): Bridge {
  if (startPage > endPage || startPage < 1) {
    return bridge;
  }

  let nextBridge = bridge;
  for (let page = startPage; page <= endPage; page += 1) {
    const exists = nextBridge.sections.some((section) => section.pdfPage === page);
    if (!exists) {
      nextBridge = addSection(nextBridge, page);
    }
  }

  return nextBridge;
}

export function updateBridgeSections(bridge: Bridge, sections: Section[]): Bridge {
  return {
    ...bridge,
    sections: sections.map((section) => ({
      ...section,
      bridgeId: bridge.id,
    })),
  };
}

export function findSection(bridge: Bridge, sectionId: string): Section | null {
  return bridge.sections.find((section) => section.id === sectionId) ?? null;
}

export function reindexSectionPdfPages(bridge: Bridge): Bridge {
  const ordered = sortSectionsByPdfPage(bridge.sections);
  return {
    ...bridge,
    sections: ordered.map((section, index) => ({
      ...section,
      pdfPage: index + 1,
    })),
  };
}

export function createSectionListServiceId(): string {
  return createUniqueId("section-list-op");
}
