"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUPPORTED_LINER_DRAFT_SCHEMA_VERSIONS = exports.LINER_DRAFT_SCHEMA_VERSION = exports.CURRENT_LINER_DRAFT_SCHEMA_VERSION = exports.PROJECT_LINER_METADATA_SCHEMA_VERSION = void 0;
exports.isSupportedVersion = isSupportedVersion;
exports.readDraftSchemaVersion = readDraftSchemaVersion;
exports.PROJECT_LINER_METADATA_SCHEMA_VERSION = "0.1.0";
exports.CURRENT_LINER_DRAFT_SCHEMA_VERSION = "0.3.0";
exports.LINER_DRAFT_SCHEMA_VERSION = exports.CURRENT_LINER_DRAFT_SCHEMA_VERSION;
exports.SUPPORTED_LINER_DRAFT_SCHEMA_VERSIONS = ["0.1.0", "0.2.0", "0.3.0"];
function isSupportedVersion(v) {
    return exports.SUPPORTED_LINER_DRAFT_SCHEMA_VERSIONS.includes(v);
}
function readDraftSchemaVersion(metadata) {
    if (typeof metadata !== "object" || metadata === null) {
        return null;
    }
    const draftSchemaVersion = metadata
        .draftSchemaVersion;
    if (typeof draftSchemaVersion === "string") {
        return draftSchemaVersion;
    }
    return null;
}
