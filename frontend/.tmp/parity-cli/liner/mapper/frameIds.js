"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.frameNodeId = frameNodeId;
exports.frameMemberId = frameMemberId;
exports.frameSupportId = frameSupportId;
exports.frameNodeIdForGridPoint = frameNodeIdForGridPoint;
function padIndex(index) {
    return index.toString().padStart(3, "0");
}
function frameNodeId(linerModelId, longitudinalIndex, transverseIndex) {
    return `N_LINER_${linerModelId}_${padIndex(longitudinalIndex)}_${padIndex(transverseIndex)}`;
}
function frameMemberId(linerModelId, direction, longitudinalIndex, transverseIndex) {
    return `M_LINER_${linerModelId}_${direction}_${padIndex(longitudinalIndex)}_${padIndex(transverseIndex)}`;
}
function frameSupportId(linerModelId, templateId, nodeId) {
    return `S_LINER_${linerModelId}_${templateId}_${nodeId}`;
}
function frameNodeIdForGridPoint(point) {
    return frameNodeId(point.id.split("-")[1] ?? "unknown", point.labels.longitudinalIndex, point.labels.transverseIndex);
}
