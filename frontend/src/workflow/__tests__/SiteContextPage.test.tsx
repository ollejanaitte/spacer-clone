// @vitest-environment jsdom
// Lane U Wave 2 U-3: Site Context screen (Lane B adapter import flow + Lane T DEM/Terrain).
import { deflateSync } from "node:zlib";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createEmptyProject } from "../../next/project/projectDataCore";
import type { Project } from "../../next/project/schema";
import type {
  SiteContextImportAdapter,
  SiteContextImportReport,
  SiteContextImportResult,
  SiteContextInspectResult,
} from "../../next/integration/siteContext/adapterContract";
import { buildSyntheticSiteContextPackage } from "../samplePackage";
import { SiteContextPage, type SiteContextPageProps } from "../SiteContextPage";
import { SiteContextEntryPage } from "../SiteContextEntryPage";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let host: HTMLDivElement | null = null;

async function render(node: ReactNode) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root?.render(node);
  });
}

function query(testId: string): HTMLElement | null {
  return document.querySelector(`[data-testid="${testId}"]`);
}

async function click(testId: string) {
  await act(async () => {
    query(testId)?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

async function flushTimers() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
  }
  host?.remove();
  root = null;
  host = null;
  vi.restoreAllMocks();
  window.history.pushState({}, "", "/");
});

function makeReport(overrides?: Partial<SiteContextImportReport>): SiteContextImportReport {
  return {
    projectId: "123e4567-e89b-12d3-a456-426614174000",
    projectName: "郡上市八幡 現況 (合成パッケージ)",
    schemaVersion: "1.0.0",
    sourceSchemaVersion: "2",
    warnings: [
      { code: "SC-WARN-TERRAIN-EMPTY", message: "terrain has no documents" },
      { code: "SC-WARN-CRS-HEURISTIC", message: "crs kind inferred" },
    ],
    unsupportedFields: [
      { path: "siteContext.imagery", reason: "deferred", notes: "imagery not mapped yet" },
      { path: "siteContext.vectorLayers", reason: "unsupported", notes: "vector layers ignored" },
    ],
    diagnostics: {
      migratedV1ToV2: false,
      selectionAreaMigrated: false,
      sourceCrsUnknownCount: 0,
      staleTerrainCount: 0,
      excludedSources: [],
    },
    crsImport: {
      projectCoordinateContextId: "ctx-gujo-jgd2011-6674",
      epsg: 6674,
      crsKind: "known",
      horizontalUnits: "m",
      supported: true,
    },
    terrainImport: {
      terrainCount: 0,
      importedTerrainIds: [],
      sct1Count: 0,
      missingAssetCount: 0,
      checksumVerifiedCount: 0,
    },
    version: {
      packageFormat: "sitecontext-package",
      packageVersion: "1",
      exportProfile: "sitecontext-v2",
      sourceSchemaVersion: "2",
      targetSchemaVersion: "1.0.0",
      targetPackageFormatVersion: "1",
    },
    ...overrides,
  };
}

function fakeAdapter(report: SiteContextImportReport, mode: "ok" | "error" = "ok"): SiteContextImportAdapter {
  const inspect = async (): Promise<SiteContextInspectResult> =>
    mode === "ok"
      ? { ok: true, report }
      : { ok: false, errorCode: "SC-ERR-UNSUPPORTED-CRS", message: "Tokyo datum EPSG:30163 is not supported" };
  const importPkg = async (): Promise<SiteContextImportResult> =>
    mode === "ok"
      ? { ok: true, projectId: report.projectId, report }
      : { ok: false, errorCode: "SC-ERR-UNSUPPORTED-CRS", message: "Tokyo datum EPSG:30163 is not supported" };
  return { inspect, import: importPkg };
}

function baseProps(
  project: Project,
  overrides?: Partial<SiteContextPageProps>,
): SiteContextPageProps {
  return {
    project,
    onProjectChange: vi.fn(),
    onBackToApp: vi.fn(),
    onNavigateStep: vi.fn(),
    onOpenRoadWorkflow: vi.fn(),
    ...overrides,
  };
}

// DEM fixture PNG (mirrors terrain/gsi test fixture fetcher; no network).
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
    const t = Buffer.from(type, "ascii");
    const out = Buffer.alloc(8 + data.length + 4);
    out.writeUInt32BE(data.length, 0);
    t.copy(out, 4);
    data.copy(out, 8);
    const crc = crc32(Buffer.concat([t, data]));
    out.writeUInt32BE(crc >>> 0, 8 + data.length);
    return out;
  };
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
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

describe("SiteContextPage (U-3)", () => {
  it("renders the enhanced Site Context screen with project identity and panels", async () => {
    const project = createEmptyProject("RB-001");
    const props = baseProps(project);
    await render(<SiteContextPage {...props} />);
    expect(query("site-context-page")).not.toBeNull();
    expect(query("site-context-project-card")).not.toBeNull();
    expect(query("site-context-import-panel")).not.toBeNull();
    expect(query("site-context-dem-panel")).not.toBeNull();
    expect(query("site-context-terrain-preview")).not.toBeNull();
    expect(query("canonical-workflow-nav")).not.toBeNull();
  });

  it("import flow shows warnings and unsupportedFields from the report (inspect)", async () => {
    const project = createEmptyProject("RB-001");
    const report = makeReport();
    const props = baseProps(project, {
      adapter: fakeAdapter(report),
      packageInput: buildSyntheticSiteContextPackage(),
    });
    await render(<SiteContextPage {...props} />);

    await click("site-context-inspect");
    await flushTimers();

    expect(query("site-context-import-report")).not.toBeNull();
    expect(query("site-context-import-warnings")).not.toBeNull();
    expect(query("site-context-warning-SC-WARN-TERRAIN-EMPTY")).not.toBeNull();
    expect(query("site-context-warning-SC-WARN-CRS-HEURISTIC")).not.toBeNull();
    expect(query("site-context-import-unsupported")).not.toBeNull();
    expect(query("site-context-unsupported-siteContext.imagery")).not.toBeNull();
    expect(query("site-context-unsupported-siteContext.vectorLayers")).not.toBeNull();
    expect(query("site-context-import-confirm")).not.toBeNull();
  });

  it("import flow surfaces a fail-closed adapter error in the UI", async () => {
    const project = createEmptyProject("RB-001");
    const props = baseProps(project, {
      adapter: fakeAdapter(makeReport(), "error"),
      packageInput: buildSyntheticSiteContextPackage(),
    });
    await render(<SiteContextPage {...props} />);

    await click("site-context-inspect");
    await flushTimers();

    expect(query("site-context-import-error")).not.toBeNull();
    const box = query("site-context-import-error");
    expect(box?.textContent).toContain("SC-ERR-UNSUPPORTED-CRS");
    expect(query("site-context-import-confirm")).toBeNull();
  });

  it("import confirmation commits the mapped project to the shared Project", async () => {
    const project = createEmptyProject("RB-001");
    const report = makeReport();
    const props = baseProps(project, {
      adapter: fakeAdapter(report),
      packageInput: buildSyntheticSiteContextPackage(),
    });
    await render(<SiteContextPage {...props} />);

    await click("site-context-inspect");
    await flushTimers();
    await click("site-context-import-confirm");
    await flushTimers();

    expect(query("site-context-import-done")).not.toBeNull();
    expect(props.onProjectChange).toHaveBeenCalledTimes(1);
    const committed = (props.onProjectChange as ReturnType<typeof vi.fn>).mock.calls[0][0] as Project;
    expect(committed.projectId.length).toBeGreaterThan(0);
  });

  it("Gujo sample preset loads a terrain preview and applies it to the same Project", async () => {
    const project = createEmptyProject("RB-001");
    const props = baseProps(project);
    await render(<SiteContextPage {...props} />);

    await click("site-context-gujo-sample");
    await flushTimers();

    expect(query("site-context-preview-data")).not.toBeNull();
    expect(query("site-context-gujo-note")).not.toBeNull();
    expect(props.onProjectChange).toHaveBeenCalledTimes(1);
    const committed = (props.onProjectChange as ReturnType<typeof vi.fn>).mock.calls[0][0] as Project;
    expect(committed.projectId).toBe(project.projectId);
    expect(committed.modules.terrain).toBeDefined();
  });

  it("DEM fetch renders progress + cancel controls and completes with a preview (injected fetcher)", async () => {
    const project = createEmptyProject("RB-001");
    const png = makePng(256, 256, (x, y) => elevToRgb(100 + ((x + y) % 3)));
    const props = baseProps(project, {
      demFetcher: async () => png,
    });
    await render(<SiteContextPage {...props} />);

    await click("site-context-dem-fetch");
    await flushTimers();

    expect(query("site-context-preview-data")).not.toBeNull();
    const preview = query("site-context-preview-data");
    expect(preview?.textContent).toContain("GSI dem5a");
    expect(preview?.textContent).toContain("36");
    expect(query("site-context-dem-cancel")).toBeNull();
  });

  it("cancel control renders during a DEM fetch and cancel aborts the flow", async () => {
    const project = createEmptyProject("RB-001");
    const props = baseProps(project, {
      demFetcher: (_url: string, signal?: AbortSignal) =>
        new Promise<Uint8Array>((_resolve, reject) => {
          if (signal?.aborted) {
            reject(new DOMException("aborted", "AbortError"));
            return;
          }
          signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        }),
    });
    await render(<SiteContextPage {...props} />);

    await click("site-context-dem-fetch");
    await flushTimers();

    expect(query("site-context-dem-progress")).not.toBeNull();
    expect(query("site-context-dem-cancel")).not.toBeNull();

    await click("site-context-dem-cancel");
    await flushTimers();

    expect(query("site-context-dem-cancelled")).not.toBeNull();
  });

  it("back + next-road controls navigate", async () => {
    const project = createEmptyProject("RB-001");
    const props = baseProps(project);
    await render(<SiteContextPage {...props} />);

    await click("site-context-next-road");
    expect(props.onOpenRoadWorkflow).toHaveBeenCalledTimes(1);

    await click("site-context-back");
    expect(props.onBackToApp).toHaveBeenCalledTimes(1);
  });
});

describe("SiteContextEntryPage start workflow entry (U-3)", () => {
  it("offers the workflow start button when a project is loaded", async () => {
    const onOpenWorkflow = vi.fn();
    await render(
      <SiteContextEntryPage
        projectName="RB-001"
        projectId="123e4567-e89b-12d3-a456-426614174000"
        isEmptyProject={false}
        onBackToApp={vi.fn()}
        onNavigateStep={vi.fn()}
        onOpenWorkflow={onOpenWorkflow}
      />,
    );
    expect(query("site-context-start-workflow")).not.toBeNull();
    await click("site-context-start-workflow");
    expect(onOpenWorkflow).toHaveBeenCalledTimes(1);
  });

  it("hides the workflow start button for an empty project", async () => {
    await render(
      <SiteContextEntryPage
        projectName="RB-001"
        projectId="123e4567-e89b-12d3-a456-426614174000"
        isEmptyProject={true}
        onBackToApp={vi.fn()}
        onNavigateStep={vi.fn()}
        onOpenWorkflow={vi.fn()}
      />,
    );
    expect(query("site-context-start-workflow")).toBeNull();
  });
});