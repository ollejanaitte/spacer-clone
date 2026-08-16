import type { Bounds, GridSpec } from "./types";

// 09章 Terrain Contract（Freeze）
// 移植元: site-context-prototype packages/core/src/terrain/heightfield.ts
// cell-center規則・双一次補間（最終行/列は縮退）・no-data単一sentinel

export const NO_DATA = -9999;

export interface ElevationResult {
  z: number | null;
  noDataReason?: 'outside' | 'hole';
}

export class Heightfield {
  readonly width: number;
  readonly height: number;
  readonly cellSize: number;
  readonly originX: number;
  readonly originY: number;
  readonly data: Float32Array;
  readonly noDataValue: number = NO_DATA;

  constructor(spec: GridSpec, data: Float32Array) {
    if (data.length !== spec.width * spec.height) {
      throw new Error(`TER-GRID-SIZE: expected ${spec.width * spec.height} got ${data.length}`);
    }
    this.width = spec.width;
    this.height = spec.height;
    this.cellSize = spec.cellSize;
    this.originX = spec.originX;
    this.originY = spec.originY;
    this.data = data;
  }

  /** セル中心 (i,j) の座標（09章2節） */
  cellCenterX(i: number): number {
    return this.originX + i * this.cellSize;
  }
  cellCenterY(j: number): number {
    return this.originY + j * this.cellSize;
  }

  /** bounds導出（セル中心規則） */
  bounds(): Bounds {
    return {
      minX: this.originX,
      maxX: this.originX + (this.width - 1) * this.cellSize,
      minY: this.originY,
      maxY: this.originY + (this.height - 1) * this.cellSize,
    };
  }

  contains(x: number, y: number): boolean {
    const b = this.bounds();
    return x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY;
  }

  at(i: number, j: number): number {
    return this.data[j * this.width + i];
  }

  isNoData(i: number, j: number): boolean {
    return this.at(i, j) === this.noDataValue;
  }

  /** セル中心座標から最も近いセルindex（floor） */
  private cellIndex(x: number, y: number): { i: number; j: number } {
    const i = Math.floor((x - this.originX) / this.cellSize);
    const j = Math.floor((y - this.originY) / this.cellSize);
    return { i, j };
  }

  /**
   * 任意位置の標高照会（双一次・FN-F04境界縮退）
   * - 範囲外: null / outside
   * - 4近傍のいずれかno-data: null / hole
   * - 最終行/列: 線形 or 最近傍へ縮退・四隅は最近傍
   */
  getElevation(x: number, y: number): ElevationResult {
    if (!this.contains(x, y)) return { z: null, noDataReason: 'outside' };
    const { i, j } = this.cellIndex(x, y);
    // セル内の相対位置 (0..1)
    const fx = (x - this.cellCenterX(i)) / this.cellSize;
    const fy = (y - this.cellCenterY(j)) / this.cellSize;

    const hasRight = i + 1 < this.width;
    const hasUp = j + 1 < this.height;

    const sample = (ii: number, jj: number): number | null => {
      if (ii < 0 || jj < 0 || ii >= this.width || jj >= this.height) return null;
      return this.isNoData(ii, jj) ? null : this.at(ii, jj);
    };

    if (!hasRight || !hasUp) {
      // 最終行/列・四隅: 線形または最近傍へ縮退（FN-F04）
      const z00 = sample(i, j);
      if (!hasRight && !hasUp) return { z: z00, ...(z00 === null ? { noDataReason: 'hole' as const } : {}) };
      if (!hasRight) {
        // 縦方向線形（j..j+1）
        const z0 = z00;
        const z1 = sample(i, j + 1);
        if (z0 === null || z1 === null) return { z: null, noDataReason: 'hole' };
        return { z: z0 + (z1 - z0) * fy };
      }
      if (!hasUp) {
        const z0 = z00;
        const z1 = sample(i + 1, j);
        if (z0 === null || z1 === null) return { z: null, noDataReason: 'hole' };
        return { z: z0 + (z1 - z0) * fx };
      }
    }

    const z00 = sample(i, j);
    const z10 = sample(i + 1, j);
    const z01 = sample(i, j + 1);
    const z11 = sample(i + 1, j + 1);
    if (z00 === null || z10 === null || z01 === null || z11 === null) {
      return { z: null, noDataReason: 'hole' };
    }
    const a = z00 + (z10 - z00) * fx;
    const b = z01 + (z11 - z01) * fx;
    return { z: a + (b - a) * fy };
  }
}