// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./api/client", () => ({
  ApiClientError: class ApiClientError extends Error {},
  apiClient: {
    loadAutosaveCandidate: vi.fn().mockResolvedValue({ exists: false }),
    autosaveProject: vi.fn().mockResolvedValue({ ok: true }),
  },
  resolveApiUrl: (path: string) => path,
}));

vi.mock("./viewer/Viewer3D", () => ({
  Viewer3D: ({ project }: { project: { nodes: unknown[]; members: unknown[] } }) => (
    <div data-testid="mock-viewer3d">
      {project.nodes.length}/{project.members.length}
    </div>
  ),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let host: HTMLDivElement | null = null;
type ObjectURLMethodName = "createObjectURL" | "revokeObjectURL";

const originalCreateObjectURLDescriptor = Object.getOwnPropertyDescriptor(URL, "createObjectURL");
const originalRevokeObjectURLDescriptor = Object.getOwnPropertyDescriptor(URL, "revokeObjectURL");
let createObjectURLMock: ReturnType<typeof vi.fn> | null = null;

function installObjectURLMocks() {
  createObjectURLMock = vi.fn(() => "blob:project-json");
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: createObjectURLMock,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
}

function restoreObjectURLMocks() {
  restoreObjectURLMethod("createObjectURL", originalCreateObjectURLDescriptor);
  restoreObjectURLMethod("revokeObjectURL", originalRevokeObjectURLDescriptor);
  createObjectURLMock = null;
}

function restoreObjectURLMethod(name: ObjectURLMethodName, descriptor: PropertyDescriptor | undefined) {
  if (descriptor) {
    Object.defineProperty(URL, name, descriptor);
    return;
  }
  delete (URL as Partial<Record<ObjectURLMethodName, unknown>>)[name];
}

async function render(node: ReactNode) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root?.render(node);
  });
}

function inputByTestId(testId: string): HTMLInputElement {
  const input = document.querySelector(`[data-testid=${testId}]`) as HTMLInputElement | null;
  if (!input) {
    throw new Error(`Input not found: ${testId}`);
  }
  return input;
}

function selectByTestId(testId: string): HTMLSelectElement {
  const select = document.querySelector(`[data-testid=${testId}]`) as HTMLSelectElement | null;
  if (!select) {
    throw new Error(`Select not found: ${testId}`);
  }
  return select;
}

function buttonByTestId(testId: string): HTMLButtonElement {
  const button = document.querySelector(`[data-testid=${testId}]`) as HTMLButtonElement | null;
  if (!button) {
    throw new Error(`Button not found: ${testId}`);
  }
  return button;
}

function buttonByTitle(title: string): HTMLButtonElement {
  const button = document.querySelector(`button[title="${title}"]`) as HTMLButtonElement | null;
  if (!button) {
    throw new Error(`Button not found: ${title}`);
  }
  return button;
}

function setInputValue(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  valueSetter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

async function openLinerSetupViaLauncher() {
  await act(async () => {
    buttonByTestId("open-liner-list").click();
  });
  await act(async () => {
    buttonByTestId("create-liner").click();
  });
  await act(async () => {
    buttonByTestId("liner-launcher-gui").click();
  });
}

async function switchLinerSetupTab(tabId: string) {
  await act(async () => {
    buttonByTestId(`liner-setup-tab-${tabId}`).click();
  });
}

function setSelectValue(select: HTMLSelectElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value")?.set;
  valueSetter?.call(select, value);
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

async function readDownloadedProjectJson(): Promise<Record<string, any>> {
  const blob = createObjectURLMock?.mock.calls.at(-1)?.[0] as Blob | undefined;
  if (!blob) {
    throw new Error("No downloaded Blob captured.");
  }
  return JSON.parse(await blob.text()) as Record<string, any>;
}

async function openProjectJson(projectJson: Record<string, unknown>) {
  const input = document.querySelector("input[type=file]") as HTMLInputElement | null;
  if (!input) {
    throw new Error("Open project input not found.");
  }
  const file = new File([JSON.stringify(projectJson)], "project.json", {
    type: "application/json",
  });
  Object.defineProperty(input, "files", {
    configurable: true,
    value: [file],
  });
  await act(async () => {
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
  }
  host?.remove();
  root = null;
  host = null;
  restoreObjectURLMocks();
  vi.restoreAllMocks();
  window.history.pushState({}, "", "/");
});

describe("App LINER save/load integration", () => {
  it("writes embedded roadDesignDocument and reloads it through project.json", async () => {
    installObjectURLMocks();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    const { App } = await import("./App");
    window.history.pushState({}, "", "/pro");

    await render(<App />);
    await openLinerSetupViaLauncher();

    await act(async () => {
      setInputValue(inputByTestId("liner-model-id"), "liner-p1-d05");
      setInputValue(inputByTestId("liner-element-length-S1"), "42");
    });
    await switchLinerSetupTab("station");
    await act(async () => {
      setInputValue(inputByTestId("liner-origin-displayed-station"), "10");
      setInputValue(inputByTestId("liner-station-interval"), "7");
    });

    await act(async () => {
      buttonByTestId("close-liner-edit").click();
    });
    await act(async () => {
      buttonByTitle("現在のモデルを project.json として保存します。").click();
    });
    const savedProject = await readDownloadedProjectJson();

    expect(savedProject.liner?.draft).toBeUndefined();
    expect(savedProject.liner?.domainDraft).toBeUndefined();
    expect(savedProject.liner?.draftSchemaVersion).toBe("0.3.0");
    expect(savedProject.liner?.roadDesignDocument).toMatchObject({
      documentKind: "road-design",
      schemaVersion: "0.1.0",
    });
    expect(savedProject.liner?.roadDesignDocument?.bridges).toEqual([]);

    const { roadDesignDocumentToProjectLinerDomainDraft } = await import(
      "./liner/adapters/linerProjectDraft",
    );
    const { getActiveAlignmentBundle } = await import(
      "./liner/adapters/linerDomainDraftRoadDesignMapper",
    );
    const restoredFromRdd = roadDesignDocumentToProjectLinerDomainDraft(
      savedProject.liner.roadDesignDocument,
    );
    expect(restoredFromRdd.ok).toBe(true);
    if (!restoredFromRdd.ok) {
      return;
    }
    const restoredBundle = getActiveAlignmentBundle(restoredFromRdd.domainDraft)!;
    expect(restoredFromRdd.domainDraft.linerModelId).toBe("liner-p1-d05");
    expect(restoredBundle.alignment.elements).toEqual([
      expect.objectContaining({ id: "S1", length: 42 }),
    ]);
    expect(restoredBundle.stationDefinition).toEqual({
      originDisplayedStation: 10,
      interval: 7,
    });

    await openProjectJson(savedProject);
    await act(async () => {
      window.history.pushState({}, "", "/pro/liner/setup");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(inputByTestId("liner-alignment-id").value).toBe("alignment-1");
    expect(inputByTestId("liner-model-id").value).toBe("liner-p1-d05");
    expect(inputByTestId("liner-element-length-S1").value).toBe("42");
    await switchLinerSetupTab("station");
    expect(inputByTestId("liner-origin-displayed-station").value).toBe("10");
    expect(inputByTestId("liner-station-interval").value).toBe("7");
  }, 40000);

  it("preserves bridge layout spans and piers through project.json save and reload", async () => {
    installObjectURLMocks();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    const { App } = await import("./App");
    const {
      deriveLinerBridgeEntityId,
      getActiveAlignmentBundle,
      LINER_DOMAIN_DRAFT_GEOMETRY_EXTENSION_KEY,
    } = await import("./liner/adapters/linerDomainDraftRoadDesignMapper");
    window.history.pushState({}, "", "/pro");

    await render(<App />);
    await openLinerSetupViaLauncher();

    await switchLinerSetupTab("review");
    await act(async () => {
      buttonByTestId("add-bridge-pier").click();
    });
    await act(async () => {
      setInputValue(inputByTestId("bridge-pier-station-P1"), "20");
      setInputValue(inputByTestId("bridge-pier-offset-P1"), "0.5");
    });
    await act(async () => {
      buttonByTestId("add-bridge-pier").click();
    });
    await act(async () => {
      setInputValue(inputByTestId("bridge-pier-station-P2"), "80");
    });
    await act(async () => {
      buttonByTestId("add-bridge-span").click();
    });
    await act(async () => {
      setInputValue(inputByTestId("bridge-span-start-SP1"), "20");
      setInputValue(inputByTestId("bridge-span-end-SP1"), "80");
      setSelectValue(selectByTestId("bridge-span-pier-start-SP1"), "P1");
      setSelectValue(selectByTestId("bridge-span-pier-end-SP1"), "P2");
    });

    expect(document.querySelector("[data-testid=bridge-pier-row-P1]")).not.toBeNull();
    expect(document.querySelector("[data-testid=bridge-pier-row-P2]")).not.toBeNull();
    expect(document.querySelector("[data-testid=bridge-span-row-SP1]")).not.toBeNull();

    await act(async () => {
      buttonByTestId("close-liner-edit").click();
    });
    await act(async () => {
      buttonByTitle("現在のモデルを project.json として保存します。").click();
    });
    const savedProject = await readDownloadedProjectJson();

    expect(savedProject.liner?.draft).toBeUndefined();
    expect(savedProject.liner?.domainDraft).toBeUndefined();
    expect(savedProject.liner?.roadDesignDocument).toMatchObject({
      documentKind: "road-design",
    });
    expect(savedProject.liner?.roadDesignDocument?.bridges).toEqual([
      expect.objectContaining({
        entityId: deriveLinerBridgeEntityId("SP1"),
        label: "SP1",
      }),
    ]);

    const extension =
      savedProject.liner?.roadDesignDocument?.extensions?.[LINER_DOMAIN_DRAFT_GEOMETRY_EXTENSION_KEY];
    const payload = extension?.json as {
      domainDraft: {
        alignments: Array<{
          spans: Array<Record<string, unknown>>;
          piers: Array<Record<string, unknown>>;
        }>;
      };
    };
    expect(payload.domainDraft.alignments[0]?.spans).toEqual([
      expect.objectContaining({
        id: "SP1",
        startPhysicalDistance: 20,
        endPhysicalDistance: 80,
        pierIdStart: "P1",
        pierIdEnd: "P2",
      }),
    ]);
    expect(payload.domainDraft.alignments[0]?.piers).toEqual([
      expect.objectContaining({
        id: "P1",
        physicalDistance: 20,
        bearingOffsets: [{ transverseIndex: 0, offset: 0.5 }],
      }),
      expect.objectContaining({
        id: "P2",
        physicalDistance: 80,
      }),
    ]);
    expect((payload.domainDraft.alignments[0]?.piers[0]?.bearingOffsets as unknown[] | undefined)?.[0]).toEqual(
      expect.objectContaining({ transverseIndex: 0, offset: 0.5 }),
    );

    const {
      roadDesignDocumentToProjectLinerDomainDraft,
    } = await import("./liner/adapters/linerProjectDraft");
    const restoredFromRdd = roadDesignDocumentToProjectLinerDomainDraft(
      savedProject.liner.roadDesignDocument,
    );
    expect(restoredFromRdd.ok).toBe(true);
    if (!restoredFromRdd.ok) {
      return;
    }
    expect(getActiveAlignmentBundle(restoredFromRdd.domainDraft)!.spans).toEqual([
      expect.objectContaining({
        id: "SP1",
        startPhysicalDistance: 20,
        endPhysicalDistance: 80,
        pierIdStart: "P1",
        pierIdEnd: "P2",
      }),
    ]);
    expect(getActiveAlignmentBundle(restoredFromRdd.domainDraft)!.piers).toEqual([
      expect.objectContaining({
        id: "P1",
        physicalDistance: 20,
        bearingOffsets: [{ transverseIndex: 0, offset: 0.5 }],
      }),
      expect.objectContaining({
        id: "P2",
        physicalDistance: 80,
      }),
    ]);

    await openProjectJson(savedProject);
    await act(async () => {
      window.history.pushState({}, "", "/pro/liner/setup");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    await switchLinerSetupTab("review");
    expect(document.querySelector("[data-testid=bridge-pier-row-P1]")).not.toBeNull();
    expect(document.querySelector("[data-testid=bridge-pier-row-P2]")).not.toBeNull();
    expect(document.querySelector("[data-testid=bridge-span-row-SP1]")).not.toBeNull();
    expect(inputByTestId("bridge-pier-station-P1").value).toBe("20");
    expect(inputByTestId("bridge-pier-offset-P1").value).toBe("0.5");
    expect(inputByTestId("bridge-pier-station-P2").value).toBe("80");
    expect(inputByTestId("bridge-span-start-SP1").value).toBe("20");
    expect(inputByTestId("bridge-span-end-SP1").value).toBe("80");
    expect(selectByTestId("bridge-span-pier-start-SP1").value).toBe("P1");
    expect(selectByTestId("bridge-span-pier-end-SP1").value).toBe("P2");
  }, 40000);

  it("preserves drawingSettings through project.json save and reload without persisting DrawingDocument", async () => {
    installObjectURLMocks();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    const { createDefaultProject } = await import("./data/defaultProject");
    const {
      addLinerOffset,
      createDefaultLinerDraft,
      updateLinerDrawingSettings,
    } = await import("./liner/adapters/linerUiAdapter");
    const {
      withProjectLinerDraft,
      serializeProjectForPersistence,
    } = await import("./liner/adapters/linerProjectDraft");
    const { LINER_DOMAIN_DRAFT_GEOMETRY_EXTENSION_KEY } = await import(
      "./liner/adapters/linerDomainDraftRoadDesignMapper"
    );

    const drawingSettings = {
      version: "0.1.0" as const,
      planPaperSize: "A1" as const,
      profilePaperSize: "A2" as const,
      crossSectionPaperSize: "A3" as const,
      bandPaperSize: "A4" as const,
      paperOrientation: "landscape" as const,
      marginMm: 12,
    };
    const draft = updateLinerDrawingSettings(addLinerOffset(createDefaultLinerDraft()), drawingSettings);
    const serialized = serializeProjectForPersistence(withProjectLinerDraft(createDefaultProject(), draft));
    expect(serialized.ok).toBe(true);
    if (!serialized.ok) {
      return;
    }

    const { App } = await import("./App");
    window.history.pushState({}, "", "/pro");

    await render(<App />);
    await openProjectJson(serialized.project as Record<string, unknown>);

    await act(async () => {
      buttonByTitle("現在のモデルを project.json として保存します。").click();
    });
    const savedProject = await readDownloadedProjectJson();

    expect(savedProject.drawingDocument).toBeUndefined();
    expect(savedProject.liner?.draft).toBeUndefined();
    expect(savedProject.liner?.domainDraft).toBeUndefined();
    expect(savedProject.liner?.roadDesignDocument).toMatchObject({
      documentKind: "road-design",
    });

    const extension =
      savedProject.liner?.roadDesignDocument?.extensions?.[LINER_DOMAIN_DRAFT_GEOMETRY_EXTENSION_KEY];
    const payload = extension?.json as {
      domainDraft: {
        drawingSettings?: typeof drawingSettings;
      };
    };
    expect(payload.domainDraft.drawingSettings).toEqual(drawingSettings);

    const {
      roadDesignDocumentToProjectLinerDomainDraft,
    } = await import("./liner/adapters/linerProjectDraft");
    const restoredFromRdd = roadDesignDocumentToProjectLinerDomainDraft(
      savedProject.liner.roadDesignDocument,
    );
    expect(restoredFromRdd.ok).toBe(true);
    if (!restoredFromRdd.ok) {
      return;
    }
    expect(restoredFromRdd.domainDraft.drawingSettings).toEqual(drawingSettings);

    await openProjectJson(savedProject);
    await act(async () => {
      buttonByTitle("現在のモデルを project.json として保存します。").click();
    });
    const reloadedSave = await readDownloadedProjectJson();
    const reloadedExtension =
      reloadedSave.liner?.roadDesignDocument?.extensions?.[LINER_DOMAIN_DRAFT_GEOMETRY_EXTENSION_KEY];
    const reloadedPayload = reloadedExtension?.json as {
      domainDraft: {
        drawingSettings?: typeof drawingSettings;
      };
    };
    expect(reloadedPayload.domainDraft.drawingSettings).toEqual(drawingSettings);
    expect(reloadedSave.drawingDocument).toBeUndefined();
    expect(reloadedSave.liner?.drawingDocument).toBeUndefined();
  }, 40000);
});
