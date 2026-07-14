"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vec2 = vec2;
exports.vec3 = vec3;
exports.add2 = add2;
exports.scale2 = scale2;
exports.distance2 = distance2;
exports.dot2 = dot2;
exports.cross3 = cross3;
exports.normalize2 = normalize2;
exports.normalize3 = normalize3;
exports.angleToTangent = angleToTangent;
exports.angleToNormal = angleToNormal;
exports.localFrameFromAzimuth = localFrameFromAzimuth;
exports.normalizeAngle = normalizeAngle;
exports.offsetPoint = offsetPoint;
function vec2(x, y) {
    return { x, y };
}
function vec3(x, y, z) {
    return { x, y, z };
}
function add2(a, b) {
    return { x: a.x + b.x, y: a.y + b.y };
}
function scale2(v, factor) {
    return { x: v.x * factor, y: v.y * factor };
}
function distance2(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}
function dot2(a, b) {
    return a.x * b.x + a.y * b.y;
}
function cross3(a, b) {
    return {
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x,
    };
}
function normalize2(v) {
    const length = Math.hypot(v.x, v.y);
    if (length === 0) {
        return { x: 0, y: 0 };
    }
    return { x: v.x / length, y: v.y / length };
}
function normalize3(v) {
    const length = Math.hypot(v.x, v.y, v.z);
    if (length === 0) {
        return { x: 0, y: 0, z: 0 };
    }
    return { x: v.x / length, y: v.y / length, z: v.z / length };
}
function angleToTangent(azimuth) {
    return { x: Math.cos(azimuth), y: Math.sin(azimuth), z: 0 };
}
function angleToNormal(azimuth) {
    return { x: -Math.sin(azimuth), y: Math.cos(azimuth), z: 0 };
}
function localFrameFromAzimuth(azimuth) {
    const tangent = normalize3(angleToTangent(azimuth));
    const normal = normalize3(angleToNormal(azimuth));
    return {
        tangent,
        normal,
        binormal: normalize3(cross3(tangent, normal)),
    };
}
function normalizeAngle(angle) {
    const fullTurn = Math.PI * 2;
    const normalized = ((angle + Math.PI) % fullTurn + fullTurn) % fullTurn;
    return normalized - Math.PI;
}
function offsetPoint(point, azimuth, offset) {
    const normal = angleToNormal(azimuth);
    return {
        x: point.x + normal.x * offset,
        y: point.y + normal.y * offset,
    };
}
