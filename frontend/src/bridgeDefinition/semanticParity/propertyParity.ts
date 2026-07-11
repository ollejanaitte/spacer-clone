import { orientationDotProduct } from "./modelGraph";
import { compareScalarWithTolerance, nearlyEqual } from "./tolerance";
import type {
  MatchedPair,
  NormalizedMaterial,
  NormalizedMember,
  NormalizedModel,
  NormalizedSection,
  ParityMismatch,
  PropertyParitySummary,
  SemanticParityDiagnostic,
  SemanticTolerance,
  Vector3,
} from "./types";

const SECTION_PROPERTIES = ["area", "iy", "iz", "j"] as const;
const MATERIAL_PROPERTIES = ["elasticModulus", "shearModulus", "poissonRatio", "density"] as const;

type SectionProperty = (typeof SECTION_PROPERTIES)[number];
type MaterialProperty = (typeof MATERIAL_PROPERTIES)[number];

function sectionsById(sections: NormalizedSection[]): Map<string, NormalizedSection> {
  const map = new Map<string, NormalizedSection>();
  for (const section of sections) {
    if (section.sourceId) map.set(section.sourceId, section);
  }
  return map;
}

function materialsById(materials: NormalizedMaterial[]): Map<string, NormalizedMaterial> {
  const map = new Map<string, NormalizedMaterial>();
  for (const material of materials) {
    if (material.sourceId) map.set(material.sourceId, material);
  }
  return map;
}

function compareOptionalScalar(
  left: number | undefined,
  right: number | undefined,
  tolerance: SemanticTolerance,
  path: string,
  category: "section" | "property",
): { mismatch?: ParityMismatch; skipped: boolean } {
  if (left === undefined && right === undefined) {
    return { skipped: true };
  }
  if (left === undefined || right === undefined) {
    return {
      skipped: false,
      mismatch: {
        category,
        path,
        leftValue: left,
        rightValue: right,
        severity: "error",
        message: `Property ${path} is missing on one side; undefined is not treated as zero.`,
      },
    };
  }
  const result = compareScalarWithTolerance(left, right, tolerance.scalar);
  if (result.equal) return { skipped: false };
  return {
    skipped: false,
    mismatch: {
      category,
      path,
      leftValue: left,
      rightValue: right,
      delta: result.delta,
      tolerance: tolerance.scalar,
      severity: "error",
      message: `Property ${path} differs beyond scalar tolerance.`,
    },
  };
}

function compareOrientation(
  left: Vector3 | undefined,
  right: Vector3 | undefined,
  path: string,
  tolerance: SemanticTolerance,
): {
  mismatch?: ParityMismatch;
  opposite?: ParityMismatch;
  skipped: boolean;
} {
  if (left === undefined || right === undefined) {
    return { skipped: true };
  }

  const dot = orientationDotProduct(left, right);
  if (dot === undefined) {
    return {
      skipped: false,
      mismatch: {
        category: "property",
        path,
        leftValue: left,
        rightValue: right,
        severity: "error",
        message: "Member orientation vectors are non-finite or zero-length.",
      },
    };
  }

  const sameDirectionThreshold = 1 - (tolerance.angle.absolute ?? 1e-6);
  const oppositeDirectionThreshold = -1 + (tolerance.angle.absolute ?? 1e-6);

  if (dot >= sameDirectionThreshold) {
    return { skipped: false };
  }

  if (dot <= oppositeDirectionThreshold) {
    return {
      skipped: false,
      opposite: {
        category: "property",
        path,
        leftValue: left,
        rightValue: right,
        delta: dot,
        tolerance: tolerance.angle,
        severity: "warning",
        message: "Member orientation vectors point in opposite directions.",
      },
    };
  }

  return {
    skipped: false,
    mismatch: {
      category: "property",
      path,
      leftValue: left,
      rightValue: right,
      delta: dot,
      tolerance: tolerance.angle,
      severity: "error",
      message: "Member orientation vectors differ beyond angle tolerance.",
    },
  };
}

export function comparePropertyParity(
  leftModel: NormalizedModel,
  rightModel: NormalizedModel,
  memberMatches: MatchedPair[],
  tolerance: SemanticTolerance,
): {
  summary: PropertyParitySummary;
  mismatches: ParityMismatch[];
  warnings: SemanticParityDiagnostic[];
} {
  const leftMemberLookup = new Map(
    leftModel.members.map((member) => [`${member.endpointKey}:${member.trace.sourceIndex}`, member]),
  );
  const rightMemberLookup = new Map(
    rightModel.members.map((member) => [`${member.endpointKey}:${member.trace.sourceIndex}`, member]),
  );
  const leftSections = sectionsById(leftModel.sections);
  const rightSections = sectionsById(rightModel.sections);
  const leftMaterials = materialsById(leftModel.materials ?? []);
  const rightMaterials = materialsById(rightModel.materials ?? []);

  const mismatches: ParityMismatch[] = [];
  const warnings: SemanticParityDiagnostic[] = [];
  let comparedMemberCount = 0;
  let sectionMismatchCount = 0;
  let materialMismatchCount = 0;
  let orientationMismatchCount = 0;
  let orientationOppositeCount = 0;
  let skippedUndefinedCount = 0;

  for (const match of memberMatches) {
    const leftMember = leftMemberLookup.get(match.leftKey);
    const rightMember = rightMemberLookup.get(match.rightKey);
    if (!leftMember || !rightMember) continue;
    comparedMemberCount += 1;
    const basePath = leftMember.trace.sourcePath;

    const leftSection = leftMember.sectionId ? leftSections.get(leftMember.sectionId) : undefined;
    const rightSection = rightMember.sectionId ? rightSections.get(rightMember.sectionId) : undefined;
    for (const property of SECTION_PROPERTIES) {
      const leftValue = leftSection?.properties[property];
      const rightValue = rightSection?.properties[property];
      const result = compareOptionalScalar(
        leftValue,
        rightValue,
        tolerance,
        `${basePath}/section/${property}`,
        "section",
      );
      if (result.skipped) {
        skippedUndefinedCount += 1;
        continue;
      }
      if (result.mismatch) {
        sectionMismatchCount += 1;
        mismatches.push(result.mismatch);
      }
    }

    const leftMaterial = leftMember.materialId ? leftMaterials.get(leftMember.materialId) : undefined;
    const rightMaterial = rightMember.materialId ? rightMaterials.get(rightMember.materialId) : undefined;
    for (const property of MATERIAL_PROPERTIES) {
      const leftValue = leftMaterial?.properties[property];
      const rightValue = rightMaterial?.properties[property];
      const result = compareOptionalScalar(
        leftValue,
        rightValue,
        tolerance,
        `${basePath}/material/${property}`,
        "property",
      );
      if (result.skipped) {
        skippedUndefinedCount += 1;
        continue;
      }
      if (result.mismatch) {
        materialMismatchCount += 1;
        mismatches.push(result.mismatch);
      }
    }

    const orientationResult = compareOrientation(
      leftMember.orientationVector,
      rightMember.orientationVector,
      `${basePath}/orientationVector`,
      tolerance,
    );
    if (orientationResult.skipped) {
      if (leftMember.orientationVector !== undefined || rightMember.orientationVector !== undefined) {
        skippedUndefinedCount += 1;
      }
    } else if (orientationResult.opposite) {
      orientationOppositeCount += 1;
      mismatches.push(orientationResult.opposite);
    } else if (orientationResult.mismatch) {
      orientationMismatchCount += 1;
      mismatches.push(orientationResult.mismatch);
    }
  }

  return {
    summary: {
      comparedMemberCount,
      sectionMismatchCount,
      materialMismatchCount,
      orientationMismatchCount,
      orientationOppositeCount,
      skippedUndefinedCount,
    },
    mismatches,
    warnings,
  };
}

export function isNearEqualProperty(
  left: number | undefined,
  right: number | undefined,
  tolerance: SemanticTolerance,
): boolean {
  if (left === undefined || right === undefined) return false;
  return nearlyEqual(left, right, tolerance.scalar);
}

export function resolveMemberSection(
  member: NormalizedMember,
  sections: Map<string, NormalizedSection>,
): NormalizedSection | undefined {
  return member.sectionId ? sections.get(member.sectionId) : undefined;
}

export function resolveMemberMaterial(
  member: NormalizedMember,
  materials: Map<string, NormalizedMaterial>,
): NormalizedMaterial | undefined {
  return member.materialId ? materials.get(member.materialId) : undefined;
}
