"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PARITY_REPORT_ENVELOPE_SCHEMA_VERSION = void 0;
exports.createParityReportEnvelope = createParityReportEnvelope;
exports.canonicalizeParityReportEnvelope = canonicalizeParityReportEnvelope;
exports.canonicalizeParityReportEnvelopeForGolden = canonicalizeParityReportEnvelopeForGolden;
exports.serializeParityReportEnvelopeForGolden = serializeParityReportEnvelopeForGolden;
exports.serializeParityReportEnvelope = serializeParityReportEnvelope;
exports.PARITY_REPORT_ENVELOPE_SCHEMA_VERSION = "1.0.0";
function compareStrings(a, b) {
    const left = a ?? "";
    const right = b ?? "";
    if (left < right)
        return -1;
    if (left > right)
        return 1;
    return 0;
}
function sortStrings(values) {
    return [...values].sort(compareStrings);
}
function sortNumbers(values) {
    return [...values].sort((left, right) => left - right);
}
function canonicalValueKey(value, seen) {
    if (value === undefined) {
        return "";
    }
    return JSON.stringify(canonicalizeJsonValue(value, seen));
}
function compareMismatches(left, right) {
    const seen = new WeakSet();
    return (compareStrings(left.category, right.category)
        || compareStrings(left.path, right.path)
        || compareStrings(left.severity, right.severity)
        || compareStrings(left.message, right.message)
        || compareStrings(canonicalValueKey(left.leftValue, seen), canonicalValueKey(right.leftValue, seen))
        || compareStrings(canonicalValueKey(left.rightValue, seen), canonicalValueKey(right.rightValue, seen)));
}
function compareDiagnostics(left, right) {
    return (compareStrings(left.category, right.category)
        || compareStrings(left.path, right.path)
        || compareStrings(left.severity, right.severity)
        || compareStrings(left.message, right.message)
        || compareStrings(left.code, right.code)
        || compareStrings(left.sourceId, right.sourceId));
}
function compareUnmatched(left, right) {
    return (compareStrings(left.key, right.key)
        || compareStrings(left.path, right.path)
        || compareStrings(left.side, right.side)
        || compareStrings(left.reason, right.reason)
        || compareStrings(left.sourceId, right.sourceId));
}
function compareAmbiguities(left, right) {
    return (compareStrings(left.category, right.category)
        || compareStrings(left.message, right.message)
        || compareStrings(sortStrings(left.leftKeys).join("\u0000"), sortStrings(right.leftKeys).join("\u0000"))
        || compareStrings(sortStrings(left.rightKeys).join("\u0000"), sortStrings(right.rightKeys).join("\u0000")));
}
function normalizeNumber(value) {
    if (Object.is(value, -0)) {
        return 0;
    }
    if (!Number.isFinite(value)) {
        throw new Error(`Non-finite number cannot be serialized: ${String(value)}`);
    }
    return value;
}
function rejectUnsupportedValue(value) {
    const kind = typeof value;
    if (kind === "bigint") {
        throw new Error("BigInt value cannot be serialized");
    }
    if (kind === "function") {
        throw new Error("Function value cannot be serialized");
    }
    if (kind === "symbol") {
        throw new Error("Symbol value cannot be serialized");
    }
    throw new Error(`Unsupported value cannot be serialized: ${kind}`);
}
function canonicalizeJsonValue(value, seen) {
    if (value === null) {
        return null;
    }
    if (value === undefined) {
        throw new Error("Undefined value cannot be serialized");
    }
    const valueType = typeof value;
    if (valueType === "boolean") {
        return value;
    }
    if (valueType === "string") {
        return value;
    }
    if (valueType === "number") {
        return normalizeNumber(value);
    }
    if (valueType === "bigint" || valueType === "function" || valueType === "symbol") {
        rejectUnsupportedValue(value);
    }
    if (Array.isArray(value)) {
        if (seen.has(value)) {
            throw new Error("Cyclic object cannot be serialized");
        }
        seen.add(value);
        const canonical = value.map((entry) => canonicalizeJsonValue(entry, seen));
        seen.delete(value);
        return canonical;
    }
    if (valueType === "object") {
        if (seen.has(value)) {
            throw new Error("Cyclic object cannot be serialized");
        }
        seen.add(value);
        const record = value;
        const keys = Object.keys(record).sort(compareStrings);
        const canonical = {};
        for (const key of keys) {
            const entry = record[key];
            if (entry === undefined) {
                continue;
            }
            canonical[key] = canonicalizeJsonValue(entry, seen);
        }
        seen.delete(value);
        return canonical;
    }
    return rejectUnsupportedValue(value);
}
function cloneJsonSafe(value) {
    const seen = new WeakSet();
    return canonicalizeJsonValue(value, seen);
}
const SOURCE_INDEX_PATH_PREFIX = /^(nodes|members|supports|sections|materials|loadCases|nodalLoads|memberLoads)\/\d+/;
const EMBEDDED_SOURCE_INDEX_PATH = /(nodes|members|supports|sections|materials|loadCases|nodalLoads|memberLoads)\/\d+/g;
function goldenEntityIndexToken(sourceId) {
    return sourceId ?? "*";
}
function normalizeGoldenSourceIndexPath(path, sourceId) {
    return path.replace(SOURCE_INDEX_PATH_PREFIX, (segment) => `${segment.split("/")[0]}/${goldenEntityIndexToken(sourceId)}`);
}
function normalizeGoldenEmbeddedPaths(text, sourceId) {
    return text.replace(EMBEDDED_SOURCE_INDEX_PATH, (segment) => normalizeGoldenSourceIndexPath(segment, sourceId));
}
function normalizeGoldenUnmatchedKey(key, sourceId) {
    if (!sourceId) {
        return key;
    }
    const escapedId = sourceId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const withoutSourceSortKey = key.replace(new RegExp(`:${escapedId}:\\d{8}$`), `:${sourceId}`);
    if (withoutSourceSortKey !== key) {
        return withoutSourceSortKey;
    }
    return key.replace(/:\d{8}$/, "");
}
function goldenMismatchSourceIdHint(mismatch) {
    for (const value of [mismatch.leftValue, mismatch.rightValue]) {
        if (typeof value === "string"
            && value.length > 0
            && !value.includes(":")
            && !value.includes("|")
            && !value.includes(",")) {
            return value;
        }
    }
    return undefined;
}
function goldenNormalizeMismatch(mismatch) {
    const sourceId = goldenMismatchSourceIdHint(mismatch);
    return {
        ...mismatch,
        path: normalizeGoldenSourceIndexPath(mismatch.path, sourceId),
        message: normalizeGoldenEmbeddedPaths(mismatch.message, sourceId),
    };
}
function goldenNormalizeDiagnostic(diagnostic) {
    return {
        ...diagnostic,
        path: normalizeGoldenSourceIndexPath(diagnostic.path, diagnostic.sourceId),
        message: normalizeGoldenEmbeddedPaths(diagnostic.message, diagnostic.sourceId),
    };
}
function goldenNormalizeUnmatched(item) {
    return {
        ...item,
        path: normalizeGoldenSourceIndexPath(item.path, item.sourceId),
        key: normalizeGoldenUnmatchedKey(item.key, item.sourceId),
    };
}
function canonicalizeReportArrays(report) {
    const canonical = cloneJsonSafe(report);
    canonical.mismatches = [...canonical.mismatches].sort(compareMismatches);
    canonical.warnings = [...canonical.warnings].sort(compareDiagnostics);
    canonical.errors = [...canonical.errors].sort(compareDiagnostics);
    canonical.unmatchedLeft = [...canonical.unmatchedLeft].sort(compareUnmatched);
    canonical.unmatchedRight = [...canonical.unmatchedRight].sort(compareUnmatched);
    canonical.ambiguities = canonical.ambiguities
        .map((ambiguity) => ({
        ...ambiguity,
        leftKeys: sortStrings(ambiguity.leftKeys),
        rightKeys: sortStrings(ambiguity.rightKeys),
    }))
        .sort(compareAmbiguities);
    if (canonical.metrics.geometry.left.matchedMemberLengthDeltas) {
        canonical.metrics.geometry.left.matchedMemberLengthDeltas = sortNumbers(canonical.metrics.geometry.left.matchedMemberLengthDeltas);
    }
    if (canonical.metrics.geometry.right.matchedMemberLengthDeltas) {
        canonical.metrics.geometry.right.matchedMemberLengthDeltas = sortNumbers(canonical.metrics.geometry.right.matchedMemberLengthDeltas);
    }
    canonical.metrics.topology.left.connectedComponentSizes = sortNumbers(canonical.metrics.topology.left.connectedComponentSizes);
    canonical.metrics.topology.right.connectedComponentSizes = sortNumbers(canonical.metrics.topology.right.connectedComponentSizes);
    return canonical;
}
function canonicalizeReportArraysForGolden(report) {
    const canonical = canonicalizeReportArrays(report);
    canonical.mismatches = canonical.mismatches
        .map(goldenNormalizeMismatch)
        .sort(compareMismatches);
    canonical.warnings = canonical.warnings
        .map(goldenNormalizeDiagnostic)
        .sort(compareDiagnostics);
    canonical.errors = canonical.errors
        .map(goldenNormalizeDiagnostic)
        .sort(compareDiagnostics);
    canonical.unmatchedLeft = canonical.unmatchedLeft
        .map(goldenNormalizeUnmatched)
        .sort(compareUnmatched);
    canonical.unmatchedRight = canonical.unmatchedRight
        .map(goldenNormalizeUnmatched)
        .sort(compareUnmatched);
    return canonical;
}
function buildEnvelope(envelope, options = {}) {
    const generatedAt = options.generatedAt ?? envelope.generatedAt;
    const next = {
        schemaVersion: envelope.schemaVersion,
        sources: {
            left: cloneJsonSafe(envelope.sources.left),
            right: cloneJsonSafe(envelope.sources.right),
        },
        tolerance: cloneJsonSafe(envelope.tolerance),
        report: canonicalizeReportArrays(envelope.report),
    };
    if (generatedAt !== undefined) {
        next.generatedAt = generatedAt;
    }
    if (envelope.toolVersion !== undefined) {
        next.toolVersion = envelope.toolVersion;
    }
    return next;
}
function createParityReportEnvelope(report, options) {
    const envelope = {
        schemaVersion: options.schemaVersion ?? exports.PARITY_REPORT_ENVELOPE_SCHEMA_VERSION,
        sources: {
            left: { ...options.sources.left },
            right: { ...options.sources.right },
        },
        tolerance: options.tolerance ?? report.tolerance,
        report,
    };
    if (options.generatedAt !== undefined) {
        envelope.generatedAt = options.generatedAt;
    }
    if (options.toolVersion !== undefined) {
        envelope.toolVersion = options.toolVersion;
    }
    return envelope;
}
function canonicalizeParityReportEnvelope(envelope, options = {}) {
    const canonical = buildEnvelope(envelope, options);
    const seen = new WeakSet();
    return canonicalizeJsonValue(canonical, seen);
}
function buildGoldenEnvelope(envelope, options = {}) {
    const generatedAt = options.generatedAt ?? envelope.generatedAt;
    const next = {
        schemaVersion: envelope.schemaVersion,
        sources: {
            left: cloneJsonSafe(envelope.sources.left),
            right: cloneJsonSafe(envelope.sources.right),
        },
        tolerance: cloneJsonSafe(envelope.tolerance),
        report: canonicalizeReportArraysForGolden(envelope.report),
    };
    if (generatedAt !== undefined) {
        next.generatedAt = generatedAt;
    }
    if (envelope.toolVersion !== undefined) {
        next.toolVersion = envelope.toolVersion;
    }
    return next;
}
function canonicalizeParityReportEnvelopeForGolden(envelope, options = {}) {
    const canonical = buildGoldenEnvelope(envelope, options);
    const seen = new WeakSet();
    return canonicalizeJsonValue(canonical, seen);
}
function serializeParityReportEnvelopeForGolden(envelope, options = {}) {
    const canonical = canonicalizeParityReportEnvelopeForGolden(envelope, {
        generatedAt: options.generatedAt,
    });
    return options.pretty !== false
        ? JSON.stringify(canonical, null, 2)
        : JSON.stringify(canonical);
}
function serializeParityReportEnvelope(envelope, options = {}) {
    const canonical = canonicalizeParityReportEnvelope(envelope, {
        generatedAt: options.generatedAt,
    });
    return options.pretty
        ? JSON.stringify(canonical, null, 2)
        : JSON.stringify(canonical);
}
