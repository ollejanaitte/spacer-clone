import { isUnresolvedProvenance, validateProvenance } from "./provenance";
import { isFiniteTolerance } from "./tolerance";
import {
  isReferenceSourceClassification,
  isRoundingPolicy,
  type RoundingPolicy,
  type VerificationMetadata,
} from "./types";

export function validateVerificationMetadata(metadata: VerificationMetadata): string[] {
  const errors: string[] = [];
  if (metadata.id.length === 0) errors.push("id is required");
  if (metadata.feature.length === 0) errors.push("feature is required");
  if (!isReferenceSourceClassification(metadata.classification)) {
    errors.push("classification is not a recognized reference source classification");
  }
  if (metadata.expected !== null && !Number.isFinite(metadata.expected)) {
    errors.push("expected must be finite or null");
  }
  if (!isFiniteTolerance(metadata.tolerance)) {
    errors.push("tolerance policy is invalid (must be finite, non-negative)");
  }
  if (metadata.tolerance.absolute === undefined && metadata.tolerance.relative === undefined && metadata.tolerance.exact !== true) {
    errors.push("tolerance policy must define absolute, relative, or exact");
  }
  errors.push(...validateProvenance(metadata.provenance));
  if (metadata.provenance !== undefined && isUnresolvedProvenance(metadata.provenance)) {
    errors.push("provenance is not authoritative (UNRESOLVED or REJECTED)");
  }
  return errors;
}

export function validateRoundingPolicy(policy: RoundingPolicy): string[] {
  if (isRoundingPolicy(policy)) return [];
  return ["rounding policy is invalid (all fields must be finite non-negative numbers)"];
}
