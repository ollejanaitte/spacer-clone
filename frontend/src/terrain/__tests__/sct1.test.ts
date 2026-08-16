import { describe, expect, it } from "vitest";
import { Heightfield, NO_DATA } from "../heightfield";
import {
  SCT1_MAGIC,
  SCT1_HEADER_SIZE,
  base64ToHeightfield,
  deserializeHeightfieldBinary,
  heightfieldToBase64,
  serializeHeightfieldBinary,
} from "../sct1";

function makeHf(): Heightfield {
  const spec = { width: 4, height: 3, cellSize: 5, originX: 84000, originY: -29600, rowMajor: true as const };
  const data = new Float32Array(12);
  for (let j = 0; j < 3; j++) {
    for (let i = 0; i < 4; i++) {
      data[j * 4 + i] = 100 + i * 10 + j * 20;
    }
  }
  data[0] = NO_DATA;
  return new Heightfield(spec, data);
}

describe("T-TER-03 SCT1 binary round-trip (09章 binary)", () => {
  it("serializes and deserializes without data loss", () => {
    const hf = makeHf();
    const bytes = serializeHeightfieldBinary(hf);
    const restored = deserializeHeightfieldBinary(bytes);
    expect(restored.width).toBe(4);
    expect(restored.height).toBe(3);
    expect(restored.cellSize).toBe(5);
    expect(restored.originX).toBe(84000);
    expect(restored.originY).toBe(-29600);
    expect(restored.data[0]).toBe(NO_DATA);
    for (let k = 1; k < 12; k++) {
      expect(restored.data[k]).toBe(hf.data[k]);
    }
  });

  it("byte layout: magic SCT1, header 42, LE fields", () => {
    const bytes = serializeHeightfieldBinary(makeHf());
    expect(SCT1_MAGIC).toBe("SCT1");
    expect(SCT1_HEADER_SIZE).toBe(42);
    expect(bytes.length).toBe(42 + 12 * 4);
    expect(String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3])).toBe("SCT1");
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    expect(dv.getUint16(4, true)).toBe(1); // formatVersion
    expect(dv.getUint32(6, true)).toBe(0); // flags
    expect(dv.getFloat32(18, true)).toBe(5); // cellSize
  });

  it("base64 round-trips", () => {
    const hf = makeHf();
    const b64 = heightfieldToBase64(hf);
    const restored = base64ToHeightfield(b64);
    expect(restored.width).toBe(4);
    expect(restored.data[1]).toBe(hf.data[1]);
    expect(restored.data[11]).toBe(hf.data[11]);
  });

  it("rejects invalid magic", () => {
    const bytes = new Uint8Array(50);
    expect(() => deserializeHeightfieldBinary(bytes)).toThrow("TER-BAD-MAGIC");
  });

  it("rejects short buffer", () => {
    expect(() => deserializeHeightfieldBinary(new Uint8Array(10))).toThrow("TER-BAD-MAGIC");
  });
});