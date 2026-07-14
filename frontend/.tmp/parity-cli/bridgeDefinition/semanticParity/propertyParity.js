"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.comparePropertyParity = comparePropertyParity;
exports.isNearEqualProperty = isNearEqualProperty;
exports.resolveMemberSection = resolveMemberSection;
exports.resolveMemberMaterial = resolveMemberMaterial;
const modelGraph_1 = require("./modelGraph");
const tolerance_1 = require("./tolerance");
const SECTION_PROPERTIES = ["area", "iy", "iz", "j"];
const MATERIAL_PROPERTIES = ["elasticModulus", "shearModulus", "poissonRatio", "density"];
function sectionsById(sections) {
    const map = new Map();
    for (const section of sections) {
        if (section.sourceId)
            map.set(section.sourceId, section);
    }
    return map;
}
function materialsById(materials) {
    const map = new Map();
    for (const material of materials) {
        if (material.sourceId)
            map.set(material.sourceId, material);
    }
    return map;
}
function compareOptionalScalar(left, right, tolerance, path, category) {
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
    const result = (0, tolerance_1.compareScalarWithTolerance)(left, right, tolerance.scalar);
    if (result.equal)
        return { skipped: false };
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
function compareOrientation(left, right, path, tolerance) {
    if (left === undefined || right === undefined) {
        return { skipped: true };
    }
    const dot = (0, modelGraph_1.orientationDotProduct)(left, right);
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
function comparePropertyParity(leftModel, rightModel, memberMatches, tolerance) {
    const leftMemberLookup = new Map(leftModel.members.map((member) => [`${member.endpointKey}:${member.trace.sourceIndex}`, member]));
    const rightMemberLookup = new Map(rightModel.members.map((member) => [`${member.endpointKey}:${member.trace.sourceIndex}`, member]));
    const leftSections = sectionsById(leftModel.sections);
    const rightSections = sectionsById(rightModel.sections);
    const leftMaterials = materialsById(leftModel.materials ?? []);
    const rightMaterials = materialsById(rightModel.materials ?? []);
    const mismatches = [];
    const warnings = [];
    let comparedMemberCount = 0;
    let sectionMismatchCount = 0;
    let materialMismatchCount = 0;
    let orientationMismatchCount = 0;
    let orientationOppositeCount = 0;
    let skippedUndefinedCount = 0;
    for (const match of memberMatches) {
        const leftMember = leftMemberLookup.get(match.leftKey);
        const rightMember = rightMemberLookup.get(match.rightKey);
        if (!leftMember || !rightMember)
            continue;
        comparedMemberCount += 1;
        const basePath = leftMember.trace.sourcePath;
        const leftSection = leftMember.sectionId ? leftSections.get(leftMember.sectionId) : undefined;
        const rightSection = rightMember.sectionId ? rightSections.get(rightMember.sectionId) : undefined;
        for (const property of SECTION_PROPERTIES) {
            const leftValue = leftSection?.properties[property];
            const rightValue = rightSection?.properties[property];
            const result = compareOptionalScalar(leftValue, rightValue, tolerance, `${basePath}/section/${property}`, "section");
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
            const result = compareOptionalScalar(leftValue, rightValue, tolerance, `${basePath}/material/${property}`, "property");
            if (result.skipped) {
                skippedUndefinedCount += 1;
                continue;
            }
            if (result.mismatch) {
                materialMismatchCount += 1;
                mismatches.push(result.mismatch);
            }
        }
        const orientationResult = compareOrientation(leftMember.orientationVector, rightMember.orientationVector, `${basePath}/orientationVector`, tolerance);
        if (orientationResult.skipped) {
            if (leftMember.orientationVector !== undefined || rightMember.orientationVector !== undefined) {
                skippedUndefinedCount += 1;
            }
        }
        else if (orientationResult.opposite) {
            orientationOppositeCount += 1;
            mismatches.push(orientationResult.opposite);
        }
        else if (orientationResult.mismatch) {
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
function isNearEqualProperty(left, right, tolerance) {
    if (left === undefined || right === undefined)
        return false;
    return (0, tolerance_1.nearlyEqual)(left, right, tolerance.scalar);
}
function resolveMemberSection(member, sections) {
    return member.sectionId ? sections.get(member.sectionId) : undefined;
}
function resolveMemberMaterial(member, materials) {
    return member.materialId ? materials.get(member.materialId) : undefined;
}
