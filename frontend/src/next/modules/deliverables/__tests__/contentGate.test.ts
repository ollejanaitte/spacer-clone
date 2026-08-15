import { describe, expect, it } from "vitest";
import {
  verifyDxfContent,
  verifyAnalysisCsv,
  verifyRoadHtmlReport,
  verifyBridgeLayoutCsv,
  verifyGlbContent,
  verifySpacerProjPackage,
  verifySuperstructureDxf,
} from "../contentGate";
import { buildAnalysisCsvExports } from "../analysisCsv";
import { buildBridgeLayoutCsvWithPreamble } from "../bridgeLayoutCsv";
import { REAL_IF3_RESULT_RAW } from "../../analysis/__tests__/realIf3Fixture";
import type { FrameAnalysisResultResource } from "../../../../contracts/frameAnalysisResultResource";

describe("WP-8 deliverable byte/content gate (P0-08)", () => {
  it("DXF gate accepts a valid DXF and rejects empty input", () => {
    const dxf = "0\nSECTION\n2\nENTITIES\n0\nLINE\n8\nPLAN_CENTER\n10\n0.0\n20\n0.0\n30\n0.0\n11\n100.0\n21\n0.0\n31\n0.0\n0\nENDSEC\n0\nEOF\n";
    const v = verifyDxfContent(dxf);
    expect(v.ok).toBe(true);
    expect(verifyDxfContent("").ok).toBe(false);
  });

  it("SS-03 uses the same DXF contract", () => {
    expect(verifySuperstructureDxf).toBe(verifyDxfContent);
  });

  it("AN-05 CSV gate validates real IF3-derived CSV with non-zero values", () => {
    const files = buildAnalysisCsvExports(REAL_IF3_RESULT_RAW as unknown as FrameAnalysisResultResource);
    const disp = files.find((f) => f.fileName === "displacements.csv")!;
    const v = verifyAnalysisCsv(disp.content, "case_id,node_id,ux,uy,uz\n");
    expect(v.ok).toBe(true);
  });

  it("AN-05 CSV gate rejects wrong header", () => {
    const v = verifyAnalysisCsv("bogus\n", "case_id,node_id");
    expect(v.ok).toBe(false);
  });

  it("RD-05 HTML gate validates report structure", () => {
    const html = "<!DOCTYPE html><html><body><h1>Alignment</h1><p>grid_points</p>" + "<p>".repeat(200) + "</p>".repeat(200) + "</body></html>";
    const v = verifyRoadHtmlReport(html);
    expect(v.ok).toBe(true);
    expect(verifyRoadHtmlReport("<div>x</div>").ok).toBe(false);
  });

  it("BL-02 CSV gate validates frozen preamble/header/schema", () => {
    const layout = {
      bridgeId: "BR-900",
      bridgeRange: { startStation: 100, endStation: 450 },
      spans: [
        { spanId: "S1", index: 0, startSupportId: "A1", endSupportId: "P1", startStation: 100, endStation: 300, length: 200 },
      ],
      abutments: {
        A1: { supportId: "A1", station: 100, label: "A1", kind: "abutment" },
        A2: { supportId: "A2", station: 450, label: "A2", kind: "abutment" },
      },
      piers: [{ supportId: "P1", label: "P1", station: 300, kind: "pier" }],
    } as never;
    const csv = buildBridgeLayoutCsvWithPreamble(layout, "cafe1234");
    const v = verifyBridgeLayoutCsv(csv);
    expect(v.ok).toBe(true);
  });

  it("CIM-02 GLB gate validates binary glTF signature", () => {
    const header = new Uint8Array([0x67, 0x6c, 0x54, 0x46]); // 'glTF'
    const rest = new Uint8Array(40);
    const buffer = new Uint8Array([...header, ...rest]).buffer;
    const v = verifyGlbContent(buffer);
    expect(v.ok).toBe(true);
    const bad = new Uint8Array(20).buffer;
    expect(verifyGlbContent(bad).ok).toBe(false);
  });

  it("SYS-01 .spacerproj gate validates package manifest", () => {
    const pkg = JSON.stringify({
      containerFormat: "spacerproj-json-v1",
      manifest: { containerFormat: "spacerproj-json-v1", modules: ["road", "bridgeLayout"], schemaVersion: "1" },
      files: [{ path: "project.json" }],
    });
    const v = verifySpacerProjPackage(pkg);
    expect(v.ok).toBe(true);
    expect(verifySpacerProjPackage("{not json").ok).toBe(false);
  });
});
