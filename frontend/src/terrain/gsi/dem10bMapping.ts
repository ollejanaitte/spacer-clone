// DEM10B Z14親タイル展開の画素マッピング（純粋関数・ブラウザ非依存・テスト可能）
// 移植元: site-context-prototype packages/core/src/importer/dem10bMapping.ts
// 子タイル(childX,childY)の画素(tx,ty) → 親タイル画素(sx,sy)
// 子タイルが親タイルの4象限（NW/NE/SW/SE）のどれかを考慮する。

export const DEM_TILE_SIZE = 256;

export function dem10bChildToParentPixel(
  childX: number,
  childY: number,
  tx: number,
  ty: number,
): { parentX: number; parentY: number; sx: number; sy: number } {
  const half = DEM_TILE_SIZE / 2; // 128
  const qx = childX % 2; // 0=西半分, 1=東半分
  const qy = childY % 2; // 0=北半分, 1=南半分
  const parentX = Math.floor(childX / 2);
  const parentY = Math.floor(childY / 2);
  const sx = qx * half + Math.floor(tx / 2);
  const sy = qy * half + Math.floor(ty / 2);
  return { parentX, parentY, sx, sy };
}