// Heightfield SCT1バイナリシリアライズ（09章6節・ブラウザ/Node共通・pure）
// 移植元: site-context-prototype packages/core/src/importer/heightfieldBinary.ts
//   （Node Buffer版 terrain/serialize.ts と同一フォーマットのため DataView 版に一本化）
// バイナリ仕様（byte単位）:
// [0:4] magic "SCT1" / [4:6] formatVersion=1 (uint16 LE) / [6:10] flags (uint32 LE)
// [10:14] width / [14:18] height (uint32 LE) / [18:22] cellSize (float32 LE)
// [22:30] originX / [30:38] originY (float64 LE) / [38:42] noDataValue (float32 LE)
// [42:] 標高値 (float32 LE, row-major)

import type { GridSpec } from "./types";
import { Heightfield, NO_DATA } from "./heightfield";

const MAGIC = 'SCT1';
const HEADER_SIZE = 42;

export function serializeHeightfieldBinary(hf: Heightfield): Uint8Array {
  const w = hf.width;
  const h = hf.height;
  const buf = new ArrayBuffer(HEADER_SIZE + w * h * 4);
  const dv = new DataView(buf);
  for (let i = 0; i < 4; i++) dv.setUint8(i, MAGIC.charCodeAt(i));
  dv.setUint16(4, 1, true);
  dv.setUint32(6, 0, true);
  dv.setUint32(10, w, true);
  dv.setUint32(14, h, true);
  dv.setFloat32(18, hf.cellSize, true);
  dv.setFloat64(22, hf.originX, true);
  dv.setFloat64(30, hf.originY, true);
  dv.setFloat32(38, hf.noDataValue, true);
  let off = HEADER_SIZE;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      dv.setFloat32(off, hf.at(i, j), true);
      off += 4;
    }
  }
  return new Uint8Array(buf);
}

export function deserializeHeightfieldBinary(bytes: Uint8Array): Heightfield {
  if (bytes.length < HEADER_SIZE) throw new Error('TER-BAD-MAGIC');
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 0; i < 4; i++) {
    if (dv.getUint8(i) !== MAGIC.charCodeAt(i)) throw new Error('TER-BAD-MAGIC');
  }
  const formatVersion = dv.getUint16(4, true);
  if (formatVersion !== 1) throw new Error(`TER-BAD-FORMAT: ${formatVersion}`);
  const flags = dv.getUint32(6, true);
  if (flags & 1) throw new Error('TER-BAD-FORMAT: masked');
  const width = dv.getUint32(10, true);
  const height = dv.getUint32(14, true);
  const cellSize = dv.getFloat32(18, true);
  const originX = dv.getFloat64(22, true);
  const originY = dv.getFloat64(30, true);
  const noDataValue = dv.getFloat32(38, true);
  const spec: GridSpec = { width, height, cellSize, originX, originY, rowMajor: true };
  const data = new Float32Array(width * height);
  let off = HEADER_SIZE;
  for (let k = 0; k < width * height; k++) {
    data[k] = dv.getFloat32(off, true);
    off += 4;
  }
  return new Heightfield(spec, data);
}

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function heightfieldToBase64(hf: Heightfield): string {
  return bytesToBase64(serializeHeightfieldBinary(hf));
}

export function base64ToHeightfield(b64: string): Heightfield {
  return deserializeHeightfieldBinary(base64ToBytes(b64));
}

export { NO_DATA };
export { MAGIC as SCT1_MAGIC, HEADER_SIZE as SCT1_HEADER_SIZE };