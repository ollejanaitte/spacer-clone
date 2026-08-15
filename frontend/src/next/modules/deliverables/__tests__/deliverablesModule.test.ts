import { describe, expect, it } from "vitest";
import { createEmptyDeliverablesManifest, isDeliverableStale } from "../deliverablesManifest";
import {
  buildBridgeLayoutCsvWithPreamble,
  parseBridgeLayoutCsv,
  bridgeLayoutCsvFileName,
} from "../bridgeLayoutCsv";
import type { BridgeLayoutDocument } from "../../bridgeLayout/bridgeLayoutTypes";

const emptyLayout: BridgeLayoutDocument = {
  bridgeId: "BR-900",
  name: "テスト橋",
  schemaVersion: "0.1.0",
  metadata: { createdBy: "test", createdAt: "2026-08-15T00:00:00.000Z" },
  roadReference: { moduleId: "road", alignmentId: "ALN", stationReferenceId: null, coordinatePolicyId: null },
  bridgeRange: { startStation: 100, endStation: 450 },
  abutments: {
    A1: { supportId: "A1", station: 100, label: "A1", kind: "abutment", terrainElevation: null, skewRad: null },
    A2: { supportId: "A2", station: 450, label: "A2", kind: "abutment", terrainElevation: null, skewRad: null },
  },
  piers: [
    { supportId: "P1", label: "P1", station: 300, kind: "pier", terrainElevation: null, skewRad: null },
  ],
  spans: [
    { spanId: "SP-1", index: 0, startSupportId: "A1", endSupportId: "P1", startStation: 100, endStation: 300, length: 200 },
    { spanId: "SP-2", index: 1, startSupportId: "P1", endSupportId: "A2", startStation: 300, endStation: 450, length: 150 },
  ],
  skew: { signConvention: "counterclockwise-positive", angleRad: null },
  validation: { schemaVersion: "0.1.0", validatedAt: null, ok: true, issues: [] },
} as unknown as BridgeLayoutDocument;

describe("deliverables manifest", () => {
  it("creates empty manifest", () => {
    expect(createEmptyDeliverablesManifest()).toEqual({ entries: [] });
  });
  it("stale when fingerprint differs", () => {
    const entry = {
      deliverableId: "RD-02",
      label: "平面図",
      kind: "dxf" as const,
      sourceModule: "road" as const,
      sourceRevision: "1",
      sourceChecksum: "abc",
      fileName: "x.dxf",
      fingerprint: "fp1",
      generatedAt: "2026-08-15",
      stale: false,
      invalid: false,
    };
    expect(isDeliverableStale(entry, "fp1")).toBe(false);
    expect(isDeliverableStale(entry, "fp2")).toBe(true);
  });
});

describe("BL-02 bridge layout CSV (P0-06)", () => {
  it("builds CSV with preamble, header and sorted rows", () => {
    const csv = buildBridgeLayoutCsvWithPreamble(emptyLayout, "cafe1234");
    const lines = csv.replace(/\r\n/g, "\n").split("\n");
    expect(lines[0]).toMatch(/^#spacer:type=bridge-layout;version=1\.0;checksum=/);
    expect(lines[1]).toBe(
      "type,id,index,supportType,label,startSupportId,endSupportId,startStation,endStation,spanLength,startSkew,endSkew,station,skewRad,terrainElevation",
    );
    expect(csv).toContain("\nspan,");
    expect(csv).toContain("\nsupport,");
  });

  it("parse validates preamble, header, row count", () => {
    const csv = buildBridgeLayoutCsvWithPreamble(emptyLayout, "cafe1234");
    const parsed = parseBridgeLayoutCsv(csv);
    expect(parsed.ok).toBe(true);
    expect(parsed.headerOk).toBe(true);
    expect(parsed.preambleChecksum).toBe("cafe1234");
    expect(parsed.rowCount).toBeGreaterThan(0);
  });

  it("rejects missing preamble", () => {
    const parsed = parseBridgeLayoutCsv("type,id\n");
    expect(parsed.ok).toBe(false);
    expect(parsed.issue).toContain("preamble");
  });

  it("rejects wrong header", () => {
    const csv = `#spacer:type=bridge-layout;version=1.0;checksum=cafe1234\ntype,id\n`;
    const parsed = parseBridgeLayoutCsv(csv);
    expect(parsed.ok).toBe(false);
    expect(parsed.issue).toContain("header");
  });

  it("sort: spans and supports by station ascending", () => {
    const csv = buildBridgeLayoutCsvWithPreamble(emptyLayout, "cafe1234");
    const dataLines = csv.replace(/\r\n/g, "\n").split("\n").slice(2).filter((l) => l.trim());
    const stations = dataLines.map((l) => {
      const cols = l.split(",");
      const idx = cols[0] === "span" ? 6 : 12;
      return Number(cols[idx]);
    });
    const sorted = [...stations].sort((a, b) => a - b);
    expect(stations).toEqual(sorted);
  });

  it("file name sanitized", () => {
    expect(bridgeLayoutCsvFileName("BR/900:1")).toMatch(/^bridge-layout-.*span-support\.csv$/);
  });
});
