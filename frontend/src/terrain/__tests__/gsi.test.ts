import { describe, expect, it } from "vitest";
import { deflateSync } from "node:zlib";
import { fetchDemTiles, tileRangeForBBox, tileResolutionMeters, DEM_FALLBACK_CHAIN } from "../gsi/gsi";
import { NO_DATA } from "../heightfield";

function makePng(width: number, height: number, pixel: (x: number, y: number) => [number, number, number]): Buffer {
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 3)] = 0;
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
  ihdr[8] = 8;
  ihdr[9] = 2;
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

function elevToRgb(h: number): [number, number, number] {
  const x = h >= 0 ? Math.round(h / 0.01) : Math.round(h / 0.01) + 2 ** 24;
  return [(x >> 16) & 0xff, (x >> 8) & 0xff, x & 0xff];
}

describe("T-GSI-03 tile range (RJ-F03 ceil/floor)", () => {
  it("half-open bbox excludes boundary tile on east edge", () => {
    const r = tileRangeForBBox(-180, -85, 180, 85, 0);
    expect(r.xMin).toBe(0);
    expect(r.xMax).toBe(0);
  });
  it("returns expected range for a point region", () => {
    const r = tileRangeForBBox(139.7, 35.6, 139.9, 35.7, 10);
    expect(r.xMax).toBeGreaterThanOrEqual(r.xMin);
    expect(r.yMax).toBeGreaterThanOrEqual(r.yMin);
  });
  });

describe("T-GSI-04 dataset table / resolution", () => {
  it("fallback chain order is dem5a → dem5b → dem10b", () => {
    expect(DEM_FALLBACK_CHAIN).toEqual(["dem5a", "dem5b", "dem10b"]);
  });
  it("tileResolutionMeters at zoom 0 is ~153m/pixel", () => {
    const r = tileResolutionMeters(0);
    expect(r).toBeCloseTo(40075016.686 / 256, 3);
  });
});

describe("T-GSI-05 GSI fetch (fixture fetcher)", () => {
  it("merges a single tile via fetcher", async () => {
    const png = makePng(256, 256, (x, y) => elevToRgb(10 + (x % 2) + (y % 2)));
    const r = await fetchDemTiles({
      bbox: { lonMin: 10, latMin: 10, lonMax: 10.5, latMax: 10.5 },
      zoom: 1,
      preferred: "dem5a",
      fetcher: async () => png,
    });
    expect(r.width).toBe(256);
    expect(r.height).toBe(256);
    expect(r.data[0]).toBeCloseTo(10, 2);
    expect(r.data[1]).toBeCloseTo(11, 2);
    expect(r.tiles.length).toBe(1);
    expect(r.tiles[0].datasetId).toBe("dem5a_png");
    expect(r.fallbackHistory.length).toBe(0);
  });

  it("fallbacks to dem5b when dem5a fetch fails (404)", async () => {
    const png5b = makePng(256, 256, (x, y) => elevToRgb(5 + (x % 2)));
    let calls = 0;
    const r = await fetchDemTiles({
      bbox: { lonMin: 10, latMin: 10, lonMax: 10.5, latMax: 10.5 },
      zoom: 1,
      preferred: "dem5a",
      maxTiles: 10,
      fetcher: async () => {
        calls += 1;
        if (calls === 1) throw new Error("404");
        return png5b;
      },
    });
    expect(r.tiles.length).toBe(1);
    expect(r.tiles[0].datasetId).toBe("dem5b_png");
    expect(r.tiles[0].fallbackFrom).toBe("dem5a→dem5b");
    expect(r.fallbackHistory.length).toBeGreaterThan(0);
  });

  it("records fallback history and fills no-data for unavailable tile", async () => {
    const r = await fetchDemTiles({
      bbox: { lonMin: 10, latMin: 10, lonMax: 10.5, latMax: 10.5 },
      zoom: 1,
      preferred: "dem5a",
      maxTiles: 10,
      fetcher: async () => {
        throw new Error("unavailable");
      },
    });
    expect(r.tiles.length).toBe(0);
    expect(r.data[0]).toBe(NO_DATA);
    expect(r.fallbackHistory.length).toBeGreaterThan(0);
  });

  it("throws GSI-TOO-MANY-TILES over maxTiles", async () => {
    await expect(
      fetchDemTiles({
        bbox: { lonMin: 130, latMin: 30, lonMax: 140, latMax: 40 },
        zoom: 8,
        preferred: "dem5a",
        maxTiles: 1,
        fetcher: async () => new Uint8Array(0),
      }),
    ).rejects.toThrow(/GSI-TOO-MANY-TILES/);
  });
});