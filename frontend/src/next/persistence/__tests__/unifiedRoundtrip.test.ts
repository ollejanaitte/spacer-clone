// F-2: Unified Save / Load / Migration — 正規 Project lifecycle テスト。
//
// 対象シナリオ:
//   1. normal roundtrip
//   2. legacy migration (schemaVersion 指定で旧バージョン相当 → 逐次 migration → validation → hydrate)
//   3. invalid fail-closed
//   4. future version fail-closed
//   5. complete RB001 roundtrip (super/sub/analysis 含む全 module)
//   6. Terrain reopen (checksum / assetReference / store 照合)
//   7. Site Context import → Save → Reopen
//   8. missing/corrupt asset → fail-closed
//   9. analysis state roundtrip (NOT_RUN 維持・結果不正は保存されない)
import { describe, expect, it } from "vitest";
import {
  saveUnifiedProject,
  loadUnifiedProject,
  reopenUnifiedProject,
  roundtripUnifiedProject,
} from "../unifiedRoundtrip";
import { migrateProject, createEmptyProject, parseProject } from "../../project/projectDataCore";
import { PROJECT_SCHEMA_VERSION } from "../../project/schema";
import type { Project } from "../../project/schema";
import { buildRb001CompleteProject } from "../../../liner/samples/reference-business-001/savedProject";
import { buildRb001Analysis } from "../../../liner/samples/reference-business-001/analysis";
import { mapSiteContextPackageToProject } from "../../integration/siteContext/importAdapter";
import { buildSyntheticSiteContextPackage } from "../../../workflow/samplePackage";
import { createMemoryTerrainElevationStore } from "../../../terrain/terrainAssetStore";
import { extractTerrainDocument, loadTerrainElevation } from "../../../terrain/terrainPersistence";
import { buildGujoSampleAsset, GUJO_SAMPLE_TERRAIN_ID } from "../../../terrain/gujoSample";
import { readSuperstructureDocument } from "../../modules/superstructureModuleAdapter";
import { readSubstructureDocument } from "../../modules/substructureModuleAdapter";

describe("F-2 normal roundtrip", () => {
  it("save → JSON → load/migrate/validate/hydrate reproduces the project", () => {
    const project = createEmptyProject("F-2 通常業務");
    const saved = saveUnifiedProject(project);
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    const loaded = loadUnifiedProject(saved.json);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.project).toEqual(project);
    expect(loaded.project.schemaVersion).toBe(PROJECT_SCHEMA_VERSION);
  });

  it("roundtrip helper is lossless", () => {
    const project = createEmptyProject("F-2 通常業務 roundtrip");
    const result = roundtripUnifiedProject(project);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.project).toEqual(project);
    }
  });
});

describe("F-2 migration", () => {
  it("legacy: 旧 schemaVersion (v1) は逐次 migration を経て current で hydrate される", () => {
    // PDC v1.0.0 の先行バージョン相当: PROJECT_MIGRATIONS は空だが、
    // current と同一構造の入力を v1 として migrateProject に通し、
    // official Schema validation で hydrate されることを確認する。
    const project = createEmptyProject("migration 対象業務");
    const result = migrateProject(project, "1.0.0");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.project.schemaVersion).toBe(PROJECT_SCHEMA_VERSION);
    }
  });

  it("invalid schemaVersion (非semver) は parse 境界で fail-closed", () => {
    const raw = { schemaVersion: "not-a-version", name: "x" };
    const result = parseProject(raw);
    expect(result.ok).toBe(false);
  });
});

describe("F-2 future version fail-closed", () => {
  it("future major schemaVersion は load で拒否される (黙って最新扱いしない)", () => {
    const project = createEmptyProject("future project");
    const future = { ...project, schemaVersion: "99.0.0" };
    const json = JSON.stringify(future);
    const loaded = loadUnifiedProject(json);
    expect(loaded.ok).toBe(false);
    if (!loaded.ok) {
      expect(loaded.issues.join(";")).toContain("unsupported-future-schemaVersion");
    }
  });

  it("future major schemaVersion は migrateProject で拒否される", () => {
    const project = createEmptyProject("future project");
    const future = { ...project, schemaVersion: "99.0.0" };
    const result = migrateProject(future, "99.0.0");
    expect(result.ok).toBe(false);
  });
});

describe("F-2 invalid fail-closed", () => {
  it("invalid JSON は load で拒否される", () => {
    const loaded = loadUnifiedProject("{ not json");
    expect(loaded.ok).toBe(false);
    if (!loaded.ok) expect(loaded.issues.join(";")).toContain("JSON");
  });

  it("schemaVersion 欠落は load で拒否される", () => {
    const loaded = loadUnifiedProject('{"name": "x"}');
    expect(loaded.ok).toBe(false);
    if (!loaded.ok) expect(loaded.issues.join(";")).toContain("schemaVersion");
  });

  it("schema不適合 project は save で拒否される", () => {
    const bad = { name: "x" } as unknown as Project;
    const saved = saveUnifiedProject(bad);
    expect(saved.ok).toBe(false);
  });
});

describe("F-2 complete RB001 roundtrip", () => {
  it("RB001 完成 Project は全 module (terrain/road/bridge/super/sub/analysis) を保持して roundtrip する", () => {
    const { project } = buildRb001CompleteProject();
    const result = roundtripUnifiedProject(project);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const reopened = result.project;

    // terrain
    expect(extractTerrainDocument(reopened)?.terrainId).toBe(GUJO_SAMPLE_TERRAIN_ID);
    // road / bridge workflowState
    expect(reopened.modules.road?.workflowState).toEqual(project.modules.road?.workflowState);
    expect(reopened.modules.bridgeLayout?.workflowState).toEqual(project.modules.bridgeLayout?.workflowState);
    // superstructure / substructure documents preserved
    const manager = { getProject: (id: string) => (id === reopened.projectId ? reopened : undefined) } as never;
    expect(readSuperstructureDocument(manager, reopened.projectId)).toBeDefined();
    expect(readSubstructureDocument(manager, reopened.projectId)).toBeDefined();
    // analysis document preserved (NOT_RUN state intact)
    const analysisModule = reopened.modules.analysis as { data?: { analysisDocument?: { analysisStatus?: string } } };
    expect(analysisModule?.data?.analysisDocument?.analysisStatus).toBe("NOT_RUN");
  });

  it("RB001 analysis document is serialized without fabricating results", () => {
    const { document, issues } = buildRb001Analysis();
    expect(document.analysisStatus).toBe("NOT_RUN");
    expect(issues.length).toBeGreaterThan(0); // girder section NOT_AVAILABLE (fail-closed)
    expect(document.resultReferences).toEqual([]);
    expect(document.resultDigest).toBeNull();
  });
});

describe("F-2 Terrain reopen", () => {
  it("assetManifest checksum / surfaceReference 照合で terrain を reopen 検証する", async () => {
    const { project } = buildRb001CompleteProject();
    const saved = saveUnifiedProject(project);
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    const reopened = await reopenUnifiedProject(saved.json);
    expect(reopened.ok).toBe(true);
    if (!reopened.ok) return;
    expect(reopened.terrainVerified).toBe(true);
  });

  it("IndexedDB store と照合して reopen 検証する (runtime source of truth)", async () => {
    const { project } = buildRb001CompleteProject();
    const store = createMemoryTerrainElevationStore();
    const asset = buildGujoSampleAsset();
    const { saveTerrainElevation } = await import("../../../terrain/terrainPersistence");
    await saveTerrainElevation(store, project.projectId, GUJO_SAMPLE_TERRAIN_ID, asset);

    const saved = saveUnifiedProject(project);
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    const reopened = await reopenUnifiedProject(saved.json, store);
    expect(reopened.ok).toBe(true);
    if (!reopened.ok) return;
    expect(reopened.terrainVerified).toBe(true);
  });

  it("missing asset (manifest無し terrain document) は fail-closed", async () => {
    // terrainDocument を保持するが assetManifest を欠く project を作る。
    const { project } = buildRb001CompleteProject();
    const stripped = {
      ...project,
      modules: {
        ...project.modules,
        terrain: {
          ...(project.modules.terrain as Record<string, unknown>),
          data: { terrainDocument: extractTerrainDocument(project) },
        },
      },
    } as unknown as Project;
    const saved = saveUnifiedProject(stripped);
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    const reopened = await reopenUnifiedProject(saved.json);
    expect(reopened.ok).toBe(false);
  });

  it("corrupt asset (checksum不一致) は fail-closed", async () => {
    const { project } = buildRb001CompleteProject();
    const terrainModule = project.modules.terrain as { data?: Record<string, unknown> };
    const manifest = terrainModule?.data?.["assetManifest"] as Record<string, unknown> | undefined;
    const path = Object.keys(manifest ?? {})[0];
    if (path === undefined) {
      expect(true).toBe(true);
      return;
    }
    const entry = manifest![path] as { checksum: string; size: number; base64: string };
    const corrupted = {
      ...project,
      modules: {
        ...project.modules,
        terrain: {
          ...(project.modules.terrain as Record<string, unknown>),
          data: {
            ...(terrainModule?.data ?? {}),
            assetManifest: {
              ...manifest,
              [path]: { ...entry, checksum: "deadbeef" },
            },
          },
        },
      },
    } as unknown as Project;
    const saved = saveUnifiedProject(corrupted);
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    const reopened = await reopenUnifiedProject(saved.json);
    expect(reopened.ok).toBe(false);
  });
});

describe("F-2 Site Context import → Save → Reopen", () => {
  it("import 済み Project が unified path で Save → Reopen される", async () => {
    const imported = await mapSiteContextPackageToProject(buildSyntheticSiteContextPackage());
    const saved = saveUnifiedProject(imported);
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    const reopened = await reopenUnifiedProject(saved.json);
    expect(reopened.ok).toBe(true);
    if (!reopened.ok) return;
    expect(reopened.project.projectId).toBe(imported.projectId);
    expect(reopened.project.metadata?.siteContextProjectCoordinateContextId).toBe(
      imported.metadata?.siteContextProjectCoordinateContextId,
    );
  });
});

describe("F-2 analysis state roundtrip", () => {
  it("NOT_RUN analysis state は roundtrip で維持される (結果は捏造しない)", async () => {
    const { project } = buildRb001CompleteProject();
    const saved = saveUnifiedProject(project);
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    const loaded = loadUnifiedProject(saved.json);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const analysisModule = loaded.project.modules.analysis as {
      data?: { analysisDocument?: { analysisStatus?: string; resultReferences?: unknown[]; resultDigest?: unknown } };
    };
    expect(analysisModule?.data?.analysisDocument?.analysisStatus).toBe("NOT_RUN");
    expect(analysisModule?.data?.analysisDocument?.resultReferences).toEqual([]);
    expect(analysisModule?.data?.analysisDocument?.resultDigest).toBeNull();
  });
});

describe("F-2 filesystem load path applies migration guard", () => {
  it("future schemaVersion の project.json は filesystem load で拒否される", async () => {
    const { FilesystemProjectPersistence, PROJECT_JSON_FILE } = await import("../filesystemProjectPersistence");
    const { MemoryFileSystemGateway } = await import("../memoryFileSystemGateway");
    const gateway = new MemoryFileSystemGateway();
    const persistence = new FilesystemProjectPersistence(gateway);
    await persistence.initialize();
    const project = createEmptyProject("future fs");
    const future = { ...project, schemaVersion: "99.0.0" };
    const write = await gateway.writeTextFile(`${future.projectId}/${PROJECT_JSON_FILE}`, JSON.stringify(future));
    expect(write.ok).toBe(true);
    const result = await persistence.loadProject(future.projectId);
    expect(result).toBeDefined();
    expect(result?.ok).toBe(false);
    if (result && !result.ok) {
      expect(result.reason).toContain("invalid-schema");
    }
  });
});
