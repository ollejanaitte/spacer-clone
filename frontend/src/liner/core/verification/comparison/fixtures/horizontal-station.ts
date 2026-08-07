import type { LinearAlignment } from "../../../types";
import { ALIGNMENT_PROFILE_ROWS } from "../../reference-data/dataset-alignment-profile";

/**
 * Fixture builder for the JIP-LINER sample alignment (CL / ECL / HCL).
 *
 * Reconstruction note: the JIP sample PDF provides element length / radius / clothoid
 * parameter and endpoint stations. The dataset does NOT record per-element start
 * coordinates, azimuths, or station-equation definitions. Therefore:
 *  - element length / radius / parameter can be reconstructed as pipeline input
 *    (INPUT_PARITY, serialization check);
 *  - cumulative station numbers in the JIP output use station equations that are NOT in
 *    the dataset, so derived station comparison is NOT_COMPARABLE except the origin.
 */

export type ReconstructedFixture = {
  alignment: LinearAlignment;
  originDisplayedStation: number;
  sourceNote: string;
};

export function buildClAlignmentFixture(): ReconstructedFixture {
  const e1 = ALIGNMENT_PROFILE_ROWS.find((r) => r.reference_id === "REF-horizontal-001");
  const e2 = ALIGNMENT_PROFILE_ROWS.find((r) => r.reference_id === "REF-horizontal-004");
  const e3 = ALIGNMENT_PROFILE_ROWS.find((r) => r.reference_id === "REF-horizontal-005");
  const radius = ALIGNMENT_PROFILE_ROWS.find((r) => r.reference_id === "REF-horizontal-002");
  const param = ALIGNMENT_PROFILE_ROWS.find((r) => r.reference_id === "REF-horizontal-003");
  const origin = ALIGNMENT_PROFILE_ROWS.find((r) => r.reference_id === "REF-station-001");

  if (!e1 || !e2 || !e3 || !radius || !param || !origin) {
    throw new Error("missing CL fixture reference rows");
  }

  return {
    alignment: {
      id: "CL",
      linerModelId: "sample",
      coordinatePolicyId: "default",
      elements: [
        {
          id: "E1",
          type: "arc",
          length: e1.normalized_value,
          start: { x: 0, y: 0 },
          azimuth: 0,
          radius: radius.normalized_value,
          turn: "right",
        },
        {
          id: "E2",
          type: "clothoid",
          length: e2.normalized_value,
          start: { x: 0, y: 0 },
          azimuth: 0,
          clothoidParameter: param.normalized_value,
          startRadius: radius.normalized_value,
          endRadius: null,
          turn: "right",
        },
        {
          id: "E3",
          type: "straight",
          length: e3.normalized_value,
          start: { x: 0, y: 0 },
          azimuth: 0,
        },
      ],
    },
    originDisplayedStation: origin.normalized_value,
    sourceNote:
      "JIP-LINER sample CL alignment, SRC-LINER-SAMPLE p7. Element length/radius/parameter " +
      "reconstructed; start coords/azimuths and station equations not in dataset.",
  };
}

export function buildEclAlignmentFixture(): ReconstructedFixture {
  const e1 = ALIGNMENT_PROFILE_ROWS.find((r) => r.reference_id === "REF-horizontal-006");
  const r1 = ALIGNMENT_PROFILE_ROWS.find((r) => r.reference_id === "REF-horizontal-007");
  const e2 = ALIGNMENT_PROFILE_ROWS.find((r) => r.reference_id === "REF-horizontal-008");
  const r2 = ALIGNMENT_PROFILE_ROWS.find((r) => r.reference_id === "REF-horizontal-008");

  if (!e1 || !r1 || !e2) {
    throw new Error("missing ECL fixture reference rows");
  }

  return {
    alignment: {
      id: "ECL",
      linerModelId: "sample",
      coordinatePolicyId: "default",
      elements: [
        { id: "E1", type: "arc", length: e1.normalized_value, start: { x: 0, y: 0 }, azimuth: 0, radius: r1.normalized_value, turn: "right" },
        { id: "E2", type: "arc", length: e2.normalized_value, start: { x: 0, y: 0 }, azimuth: 0, radius: 10000, turn: "right" },
      ],
    },
    originDisplayedStation: 0,
    sourceNote:
      "JIP-LINER sample ECL alignment, SRC-LINER-SAMPLE p8. Element length/radius " +
      "reconstructed; start coords/azimuths not in dataset. E2 radius from page 8 output (10000.0).",
  };
}

export function buildHclAlignmentFixture(): ReconstructedFixture {
  const e1 = ALIGNMENT_PROFILE_ROWS.find((r) => r.reference_id === "REF-horizontal-009");
  const r1 = ALIGNMENT_PROFILE_ROWS.find((r) => r.reference_id === "REF-horizontal-010");
  const e2 = ALIGNMENT_PROFILE_ROWS.find((r) => r.reference_id === "REF-horizontal-005");

  if (!e1 || !r1 || !e2) {
    throw new Error("missing HCL fixture reference rows");
  }

  return {
    alignment: {
      id: "HCL",
      linerModelId: "sample",
      coordinatePolicyId: "default",
      elements: [
        { id: "E1", type: "arc", length: e1.normalized_value, start: { x: 0, y: 0 }, azimuth: 0, radius: r1.normalized_value, turn: "right" },
        { id: "E2", type: "straight", length: e2.normalized_value, start: { x: 0, y: 0 }, azimuth: 0 },
      ],
    },
    originDisplayedStation: 0,
    sourceNote:
      "JIP-LINER sample HCL alignment, SRC-LINER-SAMPLE p9. Element length/radius " +
      "reconstructed; start coords/azimuths not in dataset.",
  };
}
