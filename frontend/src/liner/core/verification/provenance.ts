import {
  isR1Unit,
  isReviewStatus,
  type ReferenceProvenance,
} from "./types";

export function validateProvenance(provenance: ReferenceProvenance | undefined): string[] {
  const errors: string[] = [];
  if (provenance === undefined || provenance === null) {
    errors.push("provenance is required");
    return errors;
  }
  if (!isReviewStatus(provenance.review_status)) {
    errors.push("provenance review_status is required and must be one of UNRESOLVED|UNREVIEWED|REVIEWED|REJECTED");
  }
  if (provenance.source_unit !== undefined && !isR1Unit(provenance.source_unit)) {
    errors.push("provenance source_unit is not a recognized R1 unit");
  }
  if (provenance.source_value !== undefined && !Number.isFinite(provenance.source_value)) {
    errors.push("provenance source_value must be finite");
  }
  return errors;
}

export function isAuthoritativeProvenance(provenance: ReferenceProvenance): boolean {
  return provenance.review_status === "REVIEWED";
}

export function isUnresolvedProvenance(provenance: ReferenceProvenance): boolean {
  return provenance.review_status === "UNRESOLVED" || provenance.review_status === "REJECTED";
}
