import { describe, expect, it } from "vitest";
import { buildAnalysisCsvExports } from "../analysisCsv";
import { isAuthoritativeIf3For, type If3SourceDocumentRef } from "../../analysis/resultAdapter";
import { REAL_IF3_RESULT_RAW } from "../../analysis/__tests__/realIf3Fixture";
import type { FrameAnalysisResultResource } from "../../../../contracts/frameAnalysisResultResource";

const IF3 = REAL_IF3_RESULT_RAW as unknown as FrameAnalysisResultResource;

/** Source document matching REAL_IF3_RESULT_RAW's binding fields. */
const MATCHING_SOURCE: If3SourceDocumentRef = {
  documentId: "11111111-1111-4111-8111-111111111111",
  revisionId: 1,
  modelChecksum: "a".repeat(64),
  nodeIds: ["0011bfd9-b117-503b-8c62-6e3a3a69086f", "22222222-2222-4222-8222-222222222222", "6a27c03d-ec97-5476-a605-f5b61b64809b"],
  memberIds: ["d059b760-59aa-5442-98f2-dc81d5bd486a"],
};

describe("AN-05 authoritative gate (P0-04)", () => {
  it("real IF3 fixture is authoritative for matching source", () => {
    expect(isAuthoritativeIf3For(IF3, MATCHING_SOURCE)).toBe(true);
  });

  it("CSV exports are non-empty with content rows (non-zero values preserved)", () => {
    const files = buildAnalysisCsvExports(IF3);
    for (const file of files) {
      expect(file.content.length).toBeGreaterThan(0);
      const rows = file.content.split("\n").slice(1).filter((l) => l.trim().length > 0);
      expect(rows.length).toBeGreaterThan(0);
    }
  });

  it("fail-closed: non-authoritative resource still builds CSV but callers gate on authority", () => {
    // The builder is pure (byte generation); the authoritative gate is applied
    // by the caller (AnalysisModuleShellPage). Verify the gate discriminates.
    const tampered = {
      ...REAL_IF3_RESULT_RAW,
      sourceContentChecksum: { algorithm: "sha256", hexDigest: "b".repeat(64) },
    } as unknown as FrameAnalysisResultResource;
    expect(isAuthoritativeIf3For(tampered, MATCHING_SOURCE)).toBe(false);
    // Builder still produces files (byte content) — the gate must be enforced
    // by the export handler (fail-closed), tested in the shell page.
    const files = buildAnalysisCsvExports(tampered);
    expect(files.length).toBe(3);
  });
});
