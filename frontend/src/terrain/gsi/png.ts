import { inflateSync } from "node:zlib";

// 最小PNGデコーダ（GSI標高タイル用: 8bit・RGB/RGBA・非インターレース）
// 移植元: site-context-prototype packages/core/src/importer/png.ts
export interface PngImage {
  width: number;
  height: number;
  channels: number;
  data: Uint8Array; // RGBA展開（width*height*4）
}

export function decodePng(buf: Buffer): PngImage {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!buf.subarray(0, 8).equals(sig)) throw new Error('GSI-BAD-PNG: signature');
  let off = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0, interlace = 0;
  const idat: Buffer[] = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.subarray(off + 4, off + 8).toString('ascii');
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    off += 12 + len;
  }
  if (bitDepth !== 8) throw new Error(`GSI-UNSUPPORTED-BITDEPTH: ${bitDepth}`);
  if (colorType !== 2 && colorType !== 6) throw new Error(`GSI-UNSUPPORTED-COLORTYPE: ${colorType}`);
  if (interlace !== 0) throw new Error('GSI-UNSUPPORTED-INTERLACE');

  const channels = colorType === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = new Uint8Array(width * height * 4);
  const prev = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const rowStart = y * (stride + 1) + 1;
    const cur = raw.subarray(rowStart, rowStart + stride);
    const recon = new Uint8Array(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? recon[x - channels] : 0;
      const b = prev[x];
      const c = x >= channels ? prev[x - channels] : 0;
      let v = cur[x];
      switch (filter) {
        case 0: break;
        case 1: v = (v + a) & 0xff; break; // Sub
        case 2: v = (v + b) & 0xff; break; // Up
        case 3: v = (v + ((a + b) >> 1)) & 0xff; break; // Average
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
          v = (v + pr) & 0xff;
          break;
        }
        default:
          throw new Error('GSI-BAD-PNG-FILTER');
      }
      recon[x] = v;
    }
    for (let x = 0; x < stride; x += channels) {
      const ox = (y * width + x / channels) * 4;
      out[ox] = recon[x];
      out[ox + 1] = recon[x + 1];
      out[ox + 2] = recon[x + 2];
      out[ox + 3] = channels === 4 ? recon[x + 3] : 255;
    }
    prev.set(recon);
  }
  return { width, height, channels, data: out };
}

/**
 * GSI標高タイルPNG復号（13章3節・RJ-C01・公式仕様）:
 * x = 2^16*R + 2^8*G + B
 * x <  2^23 → h = x * 0.01
 * x == 2^23 → no-data
 * x >  2^23 → h = (x - 2^24) * 0.01
 */
export function decodeDemTile(png: PngImage): { width: number; height: number; data: Float32Array } {
  const data = new Float32Array(png.width * png.height);
  for (let k = 0; k < png.width * png.height; k++) {
    const R = png.data[k * 4];
    const G = png.data[k * 4 + 1];
    const B = png.data[k * 4 + 2];
    const x = (R << 16) + (G << 8) + B;
    if (x < 2 ** 23) {
      data[k] = x * 0.01;
    } else if (x === 2 ** 23) {
      data[k] = -9999; // no-data
    } else {
      data[k] = (x - 2 ** 24) * 0.01;
    }
  }
  return { width: png.width, height: png.height, data };
}