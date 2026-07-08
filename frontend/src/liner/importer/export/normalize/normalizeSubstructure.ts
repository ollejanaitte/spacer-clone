import type {
  CrossBeamDraft,
  PierDraft,
  WidthChangePointDraft,
} from "../../../schema/types";
import type { LinerBridge } from "../../types";
import type { NormalizationContext } from "./normalizationContext";

export function normalizeSupports(bridge: LinerBridge, ctx: NormalizationContext): PierDraft[] {
  const src = bridge.substructure?.supports ?? [];
  return src.map((support) => ({
    id: support.id,
    physicalDistance: ctx.toNormalized(
      support.station,
      `substructure.supports[${support.id}].station`,
    ),
    kind: support.kind,
    skewAngleRad:
      support.skewAngleDeg != null ? (support.skewAngleDeg * Math.PI) / 180 : undefined,
  }));
}

export function normalizeCrossBeams(
  bridge: LinerBridge,
  ctx: NormalizationContext,
): CrossBeamDraft[] | undefined {
  const src = bridge.substructure?.crossBeams ?? [];
  if (src.length === 0) return undefined;
  return src.map((crossBeam) => ({
    id: crossBeam.id,
    physicalDistance: ctx.toNormalized(
      crossBeam.station,
      `substructure.crossBeams[${crossBeam.id}].station`,
    ),
  }));
}

export function normalizeWidthPoints(
  bridge: LinerBridge,
  ctx: NormalizationContext,
): WidthChangePointDraft[] | undefined {
  const src = bridge.substructure?.widthChangePoints ?? [];
  if (src.length === 0) return undefined;
  return src.map((widthPoint) => ({
    id: widthPoint.id,
    physicalDistance: ctx.toNormalized(
      widthPoint.station,
      `substructure.widthChangePoints[${widthPoint.id}].station`,
    ),
    leftOffset: widthPoint.leftOffset,
    rightOffset: widthPoint.rightOffset,
  }));
}
