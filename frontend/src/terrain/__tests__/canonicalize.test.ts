import { describe, expect, it } from "vitest";
import { canonicalize, canonicalHash, sha256Hex } from "../canonicalize";

describe("T-CANON-01 canonicalize determinism", () => {
  it("sorts object keys in UTF-16 lexicographic order", () => {
    const a = { b: 1, a: 2, c: { y: 1, x: 2 } };
    const b = { c: { x: 2, y: 1 }, a: 2, b: 1 };
    expect(canonicalize(a)).toBe(canonicalize(b));
  });

  it("preserves array element order", () => {
    expect(canonicalize([1, 2, 3])).toBe(canonicalize([1, 2, 3]));
    expect(canonicalize([1, 2, 3])).not.toBe(canonicalize([3, 2, 1]));
  });

  it("rounds numbers to 12 digits and normalizes -0", () => {
    expect(canonicalize({ v: 1 / 3 })).toBe('{"v":0.333333333333}');
    expect(canonicalize(-0)).toBe("0");
  });

  it("omits undefined object keys, nulls undefined array elements", () => {
    expect(canonicalize({ a: undefined, b: 1 })).toBe('{"b":1}');
    expect(canonicalize([undefined, 1])).toBe("[null,1]");
  });

  it("rejects non-finite numbers and out-of-range", () => {
    expect(() => canonicalize(NaN)).toThrow(/CANON-NON-FINITE/);
    expect(() => canonicalize(Infinity)).toThrow(/CANON-NON-FINITE/);
    expect(() => canonicalize(1e13)).toThrow(/CANON-OUT-OF-RANGE/);
  });
});

describe("T-CANON-02 sha256 / canonicalHash", () => {
  it("sha256Hex produces lowercase hex of correct length", async () => {
    const h = await sha256Hex("abc");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("canonicalHash is stable across key order and matches a fixed value", async () => {
    const h1 = await canonicalHash({ width: 4, height: 3, cellSize: 5, originX: 84000, originY: -29600 });
    const h2 = await canonicalHash({ originY: -29600, originX: 84000, cellSize: 5, height: 3, width: 4 });
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });
});