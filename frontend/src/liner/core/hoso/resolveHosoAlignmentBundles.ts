import type { AlignmentBundleDraft } from "../../schema/types";

export function resolveHosoAlignmentBundles(input: {
  linerAlignments?: readonly AlignmentBundleDraft[];
  activeAlignmentId?: string;
  crossSections?: readonly import("../../schema/types").CrossSectionTemplateDraft[];
  fallbackAlignmentId: string;
}): AlignmentBundleDraft[] {
  const activeId = input.activeAlignmentId ?? input.fallbackAlignmentId;
  const base = input.linerAlignments ? [...input.linerAlignments] : [];
  if (base.length === 0) {
    return [
      {
        id: activeId,
        name: activeId,
        enabled: true,
        sortIndex: 0,
        alignment: { id: activeId, elements: [] },
        stationDefinition: {
          originDisplayedStation: 0,
          interval: 10,
        },
        verticalAlignment: {
          id: `VA-${activeId}`,
          elements: [],
        },
        crossSections: [...(input.crossSections ?? [])],
        gridDefinitions: [],
        spans: [],
        piers: [],
      },
    ];
  }

  return base.map((bundle) =>
    bundle.id === activeId && input.crossSections?.length
      ? { ...bundle, crossSections: [...input.crossSections] }
      : bundle,
  );
}
