import { describe, expect, it } from "vitest";
import { createHash } from "./nodeCrypto";

describe("nodeCrypto browser polyfill", () => {
  it("matches the SHA-256 standard vector used by sourceRevision", () => {
    expect(createHash("sha256").update("abc", "utf8").digest("hex")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});
