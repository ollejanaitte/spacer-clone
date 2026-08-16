import { describe, expect, it } from "vitest";
import { deflateSync } from "node:zlib";
import { decodePng, decodeDemTile } from "../gsi/png";

// ---- 合成PNG生成（8bit RGB・非インターレース） ----
function makePng(width: number, height: number, pixel: (x: number, y: number) => [number, number, number]): Buffer {
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 3)] = 0; // filter none
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixel(x, y);
      raw[y * (1 + width * 3) + 1 + x * 3] = r;
      raw[y * (1 + width * 3) + 1 + x * 3 + 1] = g;
      raw[y * (1 + width * 3) + 1 + x * 3 + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const chunk = (type: string, data: Buffer) => {
    const t = Buffer.from(type, 'ascii');
    const out = Buffer.alloc(8 + data.length + 4);
    out.writeUInt32BE(data.length, 0);
    t.copy(out, 4);
    data.copy(out, 8);
    const crc = crc32(Buffer.concat([t, data]));
    out.writeUInt32BE(crc >>> 0, 8 + data.length);
    return out;
  };
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf: Buffer): number {
  let c = -1;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

// 標高→RGB（2^23式の逆変換）
function elevToRgb(h: number): [number, number, number] {
  const x = h >= 0 ? Math.round(h / 0.01) : Math.round(h / 0.01) + 2 ** 24;
  return [(x >> 16) & 0xff, (x >> 8) & 0xff, x & 0xff];
}

describe("T-GSI-02 PNG decode (2^23 formula)", () => {
  it("decodes positive/negative/no-data", () => {
    const png = makePng(2, 2, (x, y) => {
      if (x === 0 && y === 0) return elevToRgb(12.34);
      if (x === 1 && y === 0) return elevToRgb(-5.67);
      if (x === 0 && y === 1) return [128, 0, 0]; // 2^23 → no-data
      return [0x80, 0x00, 0x00]; // 2^23 → no-data
    });
    const img = decodePng(png);
    expect(img.width).toBe(2);
    expect(img.height).toBe(2);
    const dem = decodeDemTile(img);
    expect(dem.data[0]).toBeCloseTo(12.34, 2);
    expect(dem.data[1]).toBeCloseTo(-5.67, 2);
    expect(dem.data[2]).toBe(-9999);
    expect(dem.data[3]).toBe(-9999);
  });

  it("rejects bad signature", () => {
    expect(() => decodePng(Buffer.from("nope"))).toThrow(/GSI-BAD-PNG/);
  });
});