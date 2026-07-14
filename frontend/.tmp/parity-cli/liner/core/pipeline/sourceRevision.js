"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalJson = canonicalJson;
exports.sourceRevisionFor = sourceRevisionFor;
const node_crypto_1 = require("node:crypto");
function canonicalJson(value) {
    if (value === null || typeof value !== "object") {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
    }
    const entries = Object.entries(value)
        .filter(([key]) => !["computedAt", "cachedIntermediate", "uiState"].includes(key))
        .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries
        .map(([key, entryValue]) => `${JSON.stringify(key)}:${canonicalJson(entryValue)}`)
        .join(",")}}`;
}
function sourceRevisionFor(value) {
    return (0, node_crypto_1.createHash)("sha256").update(canonicalJson(value), "utf8").digest("hex");
}
