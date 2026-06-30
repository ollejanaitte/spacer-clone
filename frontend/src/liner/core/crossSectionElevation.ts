import { applyCrossSlope } from "./crossSectionZMerge";

/** Auto-compute offset-line relative elevation from cross-slope percent (Pre-Decision #3). */
export function computeOffsetLineElevation(offset: number, slopePercent: number): number {
  return applyCrossSlope(offset, slopePercent);
}
