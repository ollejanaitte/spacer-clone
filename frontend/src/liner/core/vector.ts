import type { LocalFrame, Vec2, Vec3 } from "./types";

export function vec2(x: number, y: number): Vec2 {
  return { x, y };
}

export function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

export function add2(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function scale2(v: Vec2, factor: number): Vec2 {
  return { x: v.x * factor, y: v.y * factor };
}

export function distance2(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function dot2(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export function cross3(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function normalize2(v: Vec2): Vec2 {
  const length = Math.hypot(v.x, v.y);
  if (length === 0) {
    return { x: 0, y: 0 };
  }
  return { x: v.x / length, y: v.y / length };
}

export function normalize3(v: Vec3): Vec3 {
  const length = Math.hypot(v.x, v.y, v.z);
  if (length === 0) {
    return { x: 0, y: 0, z: 0 };
  }
  return { x: v.x / length, y: v.y / length, z: v.z / length };
}

export function angleToTangent(azimuth: number): Vec3 {
  return { x: Math.cos(azimuth), y: Math.sin(azimuth), z: 0 };
}

export function angleToNormal(azimuth: number): Vec3 {
  return { x: -Math.sin(azimuth), y: Math.cos(azimuth), z: 0 };
}

export function localFrameFromAzimuth(azimuth: number): LocalFrame {
  const tangent = normalize3(angleToTangent(azimuth));
  const normal = normalize3(angleToNormal(azimuth));
  return {
    tangent,
    normal,
    binormal: normalize3(cross3(tangent, normal)),
  };
}

export function normalizeAngle(angle: number): number {
  const fullTurn = Math.PI * 2;
  const normalized = ((angle + Math.PI) % fullTurn + fullTurn) % fullTurn;
  return normalized - Math.PI;
}

export function offsetPoint(point: Vec2, azimuth: number, offset: number): Vec2 {
  const normal = angleToNormal(azimuth);
  return {
    x: point.x + normal.x * offset,
    y: point.y + normal.y * offset,
  };
}
