// Render Coordinate Adapter（site-context-prototype 08章・FN-10）: canonical ↔ render（Three.js Y-up）
// 移植元: site-context-prototype packages/core/src/coordinate/adapter.ts
// three = (Cx - Lx, Cz - Lz, -(Cy - Ly))
//
// canonical: 測量座標（x=easting, y=northing, z=up, project canonical metric, float64）
// render: Three.js空間（Y-up, float32）
// 表示のみの変換。正本は書き換えない。
import type { LocalOrigin, Vec3 } from '../types';

/**
 * 表示のみの変換。正本は書き換えない。
 * canonical: 測量座標（project canonical metric, float64）
 * render: Three.js空間（Y-up, float32）
 */
export class RenderCoordinateAdapter {
  constructor(private localOrigin: LocalOrigin = { x: 0, y: 0, z: 0 }) {}

  setLocalOrigin(o: LocalOrigin): void {
    this.localOrigin = { ...o };
  }

  /** canonical → render */
  canonicalToRender(c: Vec3): Vec3 {
    return {
      x: c.x - this.localOrigin.x,
      y: c.z - this.localOrigin.z,
      z: -(c.y - this.localOrigin.y),
    };
  }

  /** render → canonical（ray picking等） */
  renderToCanonical(r: Vec3): Vec3 {
    return {
      x: r.x + this.localOrigin.x,
      y: -(r.z) + this.localOrigin.y,
      z: r.y + this.localOrigin.z,
    };
  }
}

/** 軸規約（08章3節）: x=easting, y=northing, z=up。方位0=+X（east）・CCW正。 */
export function azimuthToDir(azimuthDeg: number): { x: number; y: number } {
  const t = (azimuthDeg * Math.PI) / 180;
  return { x: Math.cos(t), y: Math.sin(t) };
}

/** 右法線（RJ-F01）: nr = (sinθ, -cosθ) */
export function rightNormal(azimuthDeg: number): { x: number; y: number } {
  const t = (azimuthDeg * Math.PI) / 180;
  return { x: Math.sin(t), y: -Math.cos(t) };
}