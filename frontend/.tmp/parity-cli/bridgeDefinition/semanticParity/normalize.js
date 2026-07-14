"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeLoadCaseName = normalizeLoadCaseName;
exports.loadCaseSemanticKey = loadCaseSemanticKey;
exports.normalizeProjectModelForSemanticParity = normalizeProjectModelForSemanticParity;
const tolerance_1 = require("./tolerance");
function isFiniteVector(vector) {
    return Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z);
}
function coordinateKey(position, tolerance) {
    const scale = tolerance.coordinate.absolute && tolerance.coordinate.absolute > 0
        ? tolerance.coordinate.absolute
        : 1e-6;
    const round = (value) => Math.round(value / scale) * scale;
    return [round(position.x), round(position.y), round(position.z)]
        .map((value) => value.toPrecision(15))
        .join(":");
}
function sourceSortKey(sourceId, sourceIndex) {
    return `${sourceId ?? ""}:${sourceIndex.toString().padStart(8, "0")}`;
}
function canonicalEndpointKey(leftNodeKey, rightNodeKey) {
    return [leftNodeKey, rightNodeKey].sort((a, b) => a.localeCompare(b)).join("|");
}
function numericProperty(value) {
    return Number.isFinite(value) ? value : undefined;
}
function normalizeNodes(nodes, tolerance, diagnostics) {
    return nodes
        .map((node, sourceIndex) => {
        const position = { x: node.x, y: node.y, z: node.z };
        if (!isFiniteVector(position)) {
            diagnostics.errors.push({
                category: "normalization",
                severity: "error",
                code: "SEMANTIC_NODE_NON_FINITE",
                path: `nodes/${sourceIndex}`,
                sourceId: node.id,
                message: "Node coordinates must be finite numbers.",
            });
        }
        return {
            kind: "node",
            key: coordinateKey(position, tolerance),
            stableIndex: sourceIndex,
            sourceId: node.id,
            trace: { sourceId: node.id, sourceIndex, sourcePath: `nodes/${sourceIndex}` },
            position,
        };
    })
        .sort((a, b) => a.key.localeCompare(b.key) || sourceSortKey(a.sourceId, a.stableIndex).localeCompare(sourceSortKey(b.sourceId, b.stableIndex)))
        .map((node, stableIndex) => ({ ...node, stableIndex }));
}
function normalizeMembers(members, nodesById, diagnostics) {
    return members
        .map((member, sourceIndex) => {
        const nodeI = nodesById.get(member.nodeI);
        const nodeJ = nodesById.get(member.nodeJ);
        if (!nodeI || !nodeJ) {
            diagnostics.errors.push({
                category: "normalization",
                severity: "error",
                code: "SEMANTIC_MEMBER_NODE_REF_MISSING",
                path: `members/${sourceIndex}`,
                sourceId: member.id,
                message: `Member references missing node(s): ${member.nodeI}, ${member.nodeJ}.`,
            });
        }
        const nodeIKey = nodeI?.key ?? `missing:${member.nodeI}`;
        const nodeJKey = nodeJ?.key ?? `missing:${member.nodeJ}`;
        const endpointKey = canonicalEndpointKey(nodeIKey, nodeJKey);
        const orientationVector = member.orientationVector;
        if (orientationVector && !isFiniteVector(orientationVector)) {
            diagnostics.errors.push({
                category: "normalization",
                severity: "error",
                code: "SEMANTIC_MEMBER_ORIENTATION_NON_FINITE",
                path: `members/${sourceIndex}/orientationVector`,
                sourceId: member.id,
                message: "Member orientationVector must contain finite numbers.",
            });
        }
        return {
            kind: "member",
            key: `${endpointKey}:${member.sectionId}:${member.materialId}:${sourceSortKey(member.id, sourceIndex)}`,
            stableIndex: sourceIndex,
            sourceId: member.id,
            trace: { sourceId: member.id, sourceIndex, sourcePath: `members/${sourceIndex}` },
            nodeIKey,
            nodeJKey,
            endpointKey,
            materialId: member.materialId,
            sectionId: member.sectionId,
            orientationVector,
        };
    })
        .sort((a, b) => a.endpointKey.localeCompare(b.endpointKey) || sourceSortKey(a.sourceId, a.stableIndex).localeCompare(sourceSortKey(b.sourceId, b.stableIndex)))
        .map((member, stableIndex) => ({ ...member, stableIndex }));
}
function normalizeSupports(supports, nodesById) {
    return supports
        .map((support, sourceIndex) => {
        const node = nodesById.get(support.nodeId);
        const fixity = {
            ux: support.ux,
            uy: support.uy,
            uz: support.uz,
            rx: support.rx,
            ry: support.ry,
            rz: support.rz,
        };
        const fixityKey = Object.entries(fixity).map(([key, value]) => `${key}:${value ? 1 : 0}`).join(",");
        return {
            kind: "support",
            key: `${node?.key ?? `missing:${support.nodeId}`}:${fixityKey}`,
            stableIndex: sourceIndex,
            trace: { sourceIndex, sourcePath: `supports/${sourceIndex}` },
            nodeKey: node?.key,
            sourceNodeId: support.nodeId,
            fixity,
        };
    })
        .sort((a, b) => a.key.localeCompare(b.key) || a.trace.sourceIndex - b.trace.sourceIndex)
        .map((support, stableIndex) => ({ ...support, stableIndex }));
}
function normalizeSections(sections) {
    return sections
        .map((section, sourceIndex) => ({
        kind: "section",
        key: [section.id, section.name, section.area, section.iy, section.iz, section.j].join(":"),
        stableIndex: sourceIndex,
        sourceId: section.id,
        trace: { sourceId: section.id, sourceIndex, sourcePath: `sections/${sourceIndex}` },
        properties: {
            area: numericProperty(section.area),
            iy: numericProperty(section.iy),
            iz: numericProperty(section.iz),
            j: numericProperty(section.j),
        },
    }))
        .sort((a, b) => a.key.localeCompare(b.key) || sourceSortKey(a.sourceId, a.stableIndex).localeCompare(sourceSortKey(b.sourceId, b.stableIndex)))
        .map((section, stableIndex) => ({ ...section, stableIndex }));
}
function normalizeMaterials(materials) {
    return materials
        .map((material, sourceIndex) => ({
        kind: "material",
        key: [
            material.id,
            material.name,
            material.elasticModulus,
            material.shearModulus,
            material.poissonRatio,
            material.density,
        ].join(":"),
        stableIndex: sourceIndex,
        sourceId: material.id,
        trace: { sourceId: material.id, sourceIndex, sourcePath: `materials/${sourceIndex}` },
        properties: {
            elasticModulus: numericProperty(material.elasticModulus),
            shearModulus: numericProperty(material.shearModulus),
            poissonRatio: numericProperty(material.poissonRatio),
            density: numericProperty(material.density),
        },
    }))
        .sort((a, b) => a.key.localeCompare(b.key) || sourceSortKey(a.sourceId, a.stableIndex).localeCompare(sourceSortKey(b.sourceId, b.stableIndex)))
        .map((material, stableIndex) => ({ ...material, stableIndex }));
}
function normalizeLoadCaseName(name) {
    return name.trim();
}
function loadCaseSemanticKey(name, type) {
    return `${normalizeLoadCaseName(name)}:${type}`;
}
function nodalVectorKey(vector) {
    return [vector.fx, vector.fy, vector.fz, vector.mx, vector.my, vector.mz]
        .map((value) => (Number.isFinite(value) ? value.toPrecision(15) : "nan"))
        .join(",");
}
function memberVectorKey(vector) {
    return [vector.wx, vector.wy, vector.wz]
        .map((value) => (Number.isFinite(value) ? value.toPrecision(15) : "nan"))
        .join(",");
}
function normalizeLoadCases(loadCases, diagnostics) {
    return loadCases
        .map((loadCase, sourceIndex) => {
        if (loadCase.type !== "static") {
            diagnostics.warnings.push({
                category: "load",
                severity: "info",
                code: "SEMANTIC_LOAD_CASE_TYPE_UNSUPPORTED",
                path: `loadCases/${sourceIndex}`,
                sourceId: loadCase.id,
                message: `Load case type "${loadCase.type}" is outside Step 8.5 static load parity scope.`,
            });
        }
        const semanticKey = loadCaseSemanticKey(loadCase.name, loadCase.type);
        return {
            kind: "loadCase",
            key: semanticKey,
            semanticKey,
            stableIndex: sourceIndex,
            sourceId: loadCase.id,
            trace: { sourceId: loadCase.id, sourceIndex, sourcePath: `loadCases/${sourceIndex}` },
            name: loadCase.name,
            type: loadCase.type,
        };
    })
        .sort((a, b) => a.semanticKey.localeCompare(b.semanticKey) || sourceSortKey(a.sourceId, a.stableIndex).localeCompare(sourceSortKey(b.sourceId, b.stableIndex)))
        .map((loadCase, stableIndex) => ({ ...loadCase, stableIndex }));
}
function normalizeNodalLoads(nodalLoads, nodesById, loadCaseById, diagnostics) {
    return nodalLoads
        .map((load, sourceIndex) => {
        const node = nodesById.get(load.nodeId);
        const loadCase = loadCaseById.get(load.loadCaseId);
        if (!node) {
            diagnostics.errors.push({
                category: "load",
                severity: "error",
                code: "SEMANTIC_NODAL_LOAD_NODE_REF_MISSING",
                path: `nodalLoads/${sourceIndex}`,
                sourceId: load.id,
                message: `Nodal load references missing node "${load.nodeId}".`,
            });
        }
        if (!loadCase) {
            diagnostics.errors.push({
                category: "load",
                severity: "error",
                code: "SEMANTIC_NODAL_LOAD_CASE_REF_MISSING",
                path: `nodalLoads/${sourceIndex}`,
                sourceId: load.id,
                message: `Nodal load references missing load case "${load.loadCaseId}".`,
            });
        }
        const vector = {
            fx: load.fx,
            fy: load.fy,
            fz: load.fz,
            mx: load.mx,
            my: load.my,
            mz: load.mz,
        };
        const nodeKey = node?.key ?? `missing:${load.nodeId}`;
        const loadCaseSemantic = loadCase?.semanticKey ?? `missing:${load.loadCaseId}`;
        const semanticKey = `${nodeKey}:${loadCaseSemantic}:${nodalVectorKey(vector)}`;
        return {
            kind: "nodalLoad",
            key: semanticKey,
            semanticKey,
            stableIndex: sourceIndex,
            sourceId: load.id,
            trace: { sourceId: load.id, sourceIndex, sourcePath: `nodalLoads/${sourceIndex}` },
            nodeKey: node?.key,
            sourceNodeId: load.nodeId,
            loadCaseSemanticKey: loadCaseSemantic,
            sourceLoadCaseId: load.loadCaseId,
            vector,
        };
    })
        .sort((a, b) => a.semanticKey.localeCompare(b.semanticKey) || sourceSortKey(a.sourceId, a.stableIndex).localeCompare(sourceSortKey(b.sourceId, b.stableIndex)))
        .map((load, stableIndex) => ({ ...load, stableIndex }));
}
function normalizeMemberLoads(memberLoads, membersById, loadCaseById, diagnostics) {
    return memberLoads
        .map((load, sourceIndex) => {
        const member = membersById.get(load.memberId);
        const loadCase = loadCaseById.get(load.loadCaseId);
        if (!member) {
            diagnostics.errors.push({
                category: "load",
                severity: "error",
                code: "SEMANTIC_MEMBER_LOAD_MEMBER_REF_MISSING",
                path: `memberLoads/${sourceIndex}`,
                sourceId: load.id,
                message: `Member load references missing member "${load.memberId}".`,
            });
        }
        if (!loadCase) {
            diagnostics.errors.push({
                category: "load",
                severity: "error",
                code: "SEMANTIC_MEMBER_LOAD_CASE_REF_MISSING",
                path: `memberLoads/${sourceIndex}`,
                sourceId: load.id,
                message: `Member load references missing load case "${load.loadCaseId}".`,
            });
        }
        if (load.type !== "uniform") {
            diagnostics.warnings.push({
                category: "load",
                severity: "info",
                code: "SEMANTIC_MEMBER_LOAD_TYPE_UNSUPPORTED",
                path: `memberLoads/${sourceIndex}`,
                sourceId: load.id,
                message: `Member load type "${load.type}" is outside Step 8.5 uniform load parity scope.`,
            });
        }
        if (load.coordinateSystem !== "local" && load.coordinateSystem !== "global") {
            diagnostics.errors.push({
                category: "load",
                severity: "error",
                code: "SEMANTIC_MEMBER_LOAD_COORDINATE_SYSTEM_INVALID",
                path: `memberLoads/${sourceIndex}`,
                sourceId: load.id,
                message: `Member load coordinateSystem "${load.coordinateSystem}" must be local or global.`,
            });
        }
        const vector = {
            wx: load.wx,
            wy: load.wy,
            wz: load.wz,
        };
        const endpointKey = member?.endpointKey ?? `missing:${load.memberId}`;
        const loadCaseSemantic = loadCase?.semanticKey ?? `missing:${load.loadCaseId}`;
        const coordinateSystem = load.coordinateSystem === "local" ? "local" : "global";
        const semanticKey = `${endpointKey}:${loadCaseSemantic}:${coordinateSystem}:${memberVectorKey(vector)}`;
        return {
            kind: "memberLoad",
            key: semanticKey,
            semanticKey,
            stableIndex: sourceIndex,
            sourceId: load.id,
            trace: { sourceId: load.id, sourceIndex, sourcePath: `memberLoads/${sourceIndex}` },
            endpointKey: member?.endpointKey,
            sourceMemberId: load.memberId,
            loadCaseSemanticKey: loadCaseSemantic,
            sourceLoadCaseId: load.loadCaseId,
            coordinateSystem,
            vector,
        };
    })
        .sort((a, b) => a.semanticKey.localeCompare(b.semanticKey) || sourceSortKey(a.sourceId, a.stableIndex).localeCompare(sourceSortKey(b.sourceId, b.stableIndex)))
        .map((load, stableIndex) => ({ ...load, stableIndex }));
}
function normalizeProjectModelForSemanticParity(model, options = {}) {
    const tolerance = (0, tolerance_1.mergeSemanticTolerance)(options.tolerance);
    const diagnostics = {
        warnings: [],
        errors: [],
    };
    const nodes = normalizeNodes(model.nodes ?? [], tolerance, diagnostics);
    const nodesById = new Map();
    for (const node of nodes) {
        if (node.sourceId)
            nodesById.set(node.sourceId, node);
    }
    const members = normalizeMembers(model.members ?? [], nodesById, diagnostics);
    const membersById = new Map();
    for (const member of members) {
        if (member.sourceId)
            membersById.set(member.sourceId, member);
    }
    const loadCases = normalizeLoadCases(model.loadCases ?? [], diagnostics);
    const loadCaseById = new Map();
    for (const loadCase of loadCases) {
        if (loadCase.sourceId)
            loadCaseById.set(loadCase.sourceId, loadCase);
    }
    return {
        metadata: {
            source: options.source ?? "unknown",
            label: options.leftLabel ?? options.rightLabel,
            units: model.units,
            loadsMapped: options.loadsMapped ?? options.leftLoadsMapped ?? options.rightLoadsMapped,
        },
        nodes,
        members,
        supports: normalizeSupports(model.supports ?? [], nodesById),
        sections: normalizeSections(model.sections ?? []),
        materials: normalizeMaterials(model.materials ?? []),
        loadCases,
        nodalLoads: normalizeNodalLoads(model.nodalLoads ?? [], nodesById, loadCaseById, diagnostics),
        memberLoads: normalizeMemberLoads(model.memberLoads ?? [], membersById, loadCaseById, diagnostics),
        warnings: diagnostics.warnings,
        errors: diagnostics.errors,
    };
}
