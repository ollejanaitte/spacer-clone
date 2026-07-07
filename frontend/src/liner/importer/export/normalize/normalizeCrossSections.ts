import type { CrossSectionTemplateDraft } from "../../../schema/types";
import type { Bridge } from "../../types";
import { defaultFrameModelEnabled } from "../../../core/frameModelTarget";
import { createUniqueId } from "../../utils/importerUtils";
import type { NormalizationContext } from "./normalizationContext";
import { resolveGirderLineOffset } from "./resolveGirderLineOffset";

export function normalizeCrossSections(
  bridge: Bridge,
  ctx: NormalizationContext,
): CrossSectionTemplateDraft[] {
  const crossSlopeDefs = bridge.alignmentMetadata?.crossSlope?.definitions ?? [];
  const girderLines = bridge.girderLineSets[0]?.lines ?? [];

  if (crossSlopeDefs.length > 0) {
    return crossSlopeDefs.map((definition, index) => {
      const normalizedStation = ctx.toNormalized(
        definition.station,
        `crossSlope.definitions[${definition.id}].station`,
      );
      return {
        id: definition.id || createUniqueId("cross-section-template"),
        name: `CrossSlope @ ${normalizedStation}`,
        station: normalizedStation,
        offsetLines: girderLines.map((line, lineIndex) => ({
          id: createUniqueId("offset-line"),
          offset: resolveGirderLineOffset(line, bridge, lineIndex),
          elevation: 0,
          role:
            line.role === "edge"
              ? ("edge" as const)
              : line.role === "girder"
                ? ("lane" as const)
                : ("custom" as const),
          label: line.label,
        })),
        crossSlope: {
          signConvention: "right_down_positive" as const,
          valuePercent: definition.crossSlope,
        },
      };
    });
  }

  return [
    {
      id: createUniqueId("cross-section-template"),
      name: `${bridge.name} default`,
      offsetLines: girderLines.map((line, index) => ({
        id: createUniqueId("offset-line"),
        offset: resolveGirderLineOffset(line, bridge, index),
        elevation: 0,
        label: line.label,
        // Phase 3.9: 骨組み生成対象フラグ（HCL/CL/ECL は既定 OFF）
        frameModelEnabled: defaultFrameModelEnabled(line.label),
      })),
    },
  ];
}
