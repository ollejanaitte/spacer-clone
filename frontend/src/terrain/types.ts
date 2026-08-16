// site-context-prototype 由来の Terrain primitive 共有型（zod 非依存・素の interface）
// 移植元: packages/core/src/schema/project.ts（GridSpec / Bounds / Point3）
//         packages/core/src/coordinate/adapter.ts（Vec3 / LocalOrigin）

/** 標高グリッド仕様（cell-center 規則・行優先 float32） */
export interface GridSpec {
  width: number;
  height: number;
  cellSize: number;
  originX: number;
  originY: number;
  rowMajor: true;
}

/** 平面 2D bounds（m） */
export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** 3D 点（canonical metric） */
export interface Point3 {
  x: number;
  y: number;
  z: number;
}

/** 3D ベクトル（RenderCoordinateAdapter 用） */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** ローカル原点（表示オフセット） */
export interface LocalOrigin {
  x: number;
  y: number;
  z: number;
}