// Phase C1 (I01) project.schema.json regression: 既存互換性を保証するスキーマ検証。
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, it, expect } from "vitest";

const rootDir = dirname(fileURLToPath(import.meta.url));
// __tests__ -> substructure -> src -> frontend -> repo root
const repoRoot = join(rootDir, "../../../../");
const projectSchemaPath = join(repoRoot, "schemas/project.schema.json");
const exampleProjectPath = join(repoRoot, "examples/project.json");

function compileValidator() {
  const schemaText = readFileSync(projectSchemaPath, "utf8");
  const schema = JSON.parse(schemaText);
  const ajv = new Ajv2020({ allErrors: true, strict: false, allowUnionTypes: true });
  return ajv.compile(schema);
}

function exampleProject() {
  const raw = JSON.parse(readFileSync(exampleProjectPath, "utf8"));
  return JSON.parse(JSON.stringify(raw));
}

describe("project.schema.json regression (backward compatibility)", () => {
  it("existing project.json (no substructure) still validates", () => {
    const validate = compileValidator();
    const p = exampleProject();
    const valid = validate(p);
    expect(validate.errors ?? []).toEqual([]);
    expect(valid).toBe(true);
  });

  it("existing project.json + optional substructure still validates", () => {
    const validate = compileValidator();
    const p = exampleProject();
    (p as Record<string, unknown>).substructure = {
      schemaVersion: "0.2.0",
      projectId: "sub-001",
      source: "c1",
      coordinateSystem: "x-longitudinal-y-transverse-z-up",
      unitSystem: "si",
      supports: [
        {
          supportId: "P1",
          supportType: "pier",
          skewRad: 0,
          placement: { source: "liner", alignmentId: "aln-001", station: 50, offset: 0 },
          pier: {
            id: "P1",
            formType: "single_column_rect",
            column: { id: "P1-COLUMN-01", width: 2.0, depth: 2.2, height: 6.0 },
            cap: { id: "P1-CAP", width: 1.6, depth: 7.5, height: 1.6, overhangL: 0, overhangR: 0 },
            footing: { id: "P1-FOOTING", length: 6.0, width: 8.0, thickness: 1.8, topElevation: 0 },
            pileGroup: { id: "P1-PILEGROUP", pileType: "bored_pile", diameter: 1.2, length: 20, pileCount: 4, spacing: { x: 3, y: 3 } },
          },
        },
      ],
    };
    const valid = validate(p);
    expect(validate.errors ?? []).toEqual([]);
    expect(valid).toBe(true);
  });

  it("invalid substructure (unknown pier form) is rejected by schema", () => {
    const validate = compileValidator();
    const p = exampleProject();
    (p as any).substructure = {
      schemaVersion: "0.2.0",
      projectId: "sub-002",
      source: "c1",
      supports: [
        {
          supportId: "P1",
          supportType: "pier",
          skewRad: 0,
          placement: { source: "liner", alignmentId: "aln-001", station: 10, offset: 0 },
          pier: {
            id: "P1",
            formType: "steel_pier", // FUTURE form, not allowed
            column: { id: "P1-COLUMN-01", width: 2, depth: 2, height: 6 },
            cap: { id: "P1-CAP", width: 1.6, depth: 7.5, height: 1.6, overhangL: 0, overhangR: 0 },
            footing: { id: "P1-FOOTING", length: 6, width: 8, thickness: 1.8, topElevation: 0 },
          },
        },
      ],
    };
    const valid = validate(p);
    expect(valid).toBe(false);
  });
});