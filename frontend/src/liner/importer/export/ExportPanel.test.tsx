/**
 * @vitest-environment jsdom
 */
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultImporterProjectService } from "../ImporterProjectService";
import { createSampleImporterProject } from "../__tests__/fixtures/sampleProject";
import { clearImporterStorageForTests } from "../storage/importerStorage";
import { clearRecoveryStateForTests } from "../storage/recoveryManager";
import { ExportPanel } from "./ExportPanel";
import { getActiveAlignmentBundle } from "../../adapters/linerDomainDraftRoadDesignMapper";
import { resolveLinerUiRoutePath } from "../../uiPreparation";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let host: HTMLDivElement | null = null;

function render(node: ReactNode) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root?.render(node);
  });
}

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
  }
  host?.remove();
  root = null;
  host = null;
  clearImporterStorageForTests();
  clearRecoveryStateForTests();
  vi.restoreAllMocks();
});

describe("ExportPanel Phase 3.5 bridge", () => {
  beforeEach(() => {
    clearImporterStorageForTests();
    clearRecoveryStateForTests();
  });

  it("export stores draft and opens Phase 3.5 via callback", () => {
    const service = defaultImporterProjectService;
    const sample = createSampleImporterProject();
    service.saveProject(sample);
    const bridgeId = sample.bridges[0]!.id;
    const onOpenInPhase35 = vi.fn();

    render(
      <ExportPanel
        projectId={sample.id}
        bridgeId={bridgeId}
        onBack={() => undefined}
        onOpenInPhase35={onOpenInPhase35}
      />,
    );

    act(() => {
      (document.querySelector("[data-testid=export-panel-export]") as HTMLButtonElement).click();
    });

    expect(onOpenInPhase35).toHaveBeenCalledTimes(1);
    const exportedDraft = onOpenInPhase35.mock.calls[0]?.[0];
    const activeBundle = exportedDraft ? getActiveAlignmentBundle(exportedDraft) : undefined;
    expect(activeBundle?.alignment.elements.length).toBeGreaterThan(0);
    expect(activeBundle?.verticalAlignment.elements.length).toBeGreaterThan(0);
    expect(document.querySelector("[data-testid=export-panel-status]")?.textContent).toContain(
      "Phase 3.5 draft",
    );
  });

  it("download JSON does not open Phase 3.5", () => {
    const service = defaultImporterProjectService;
    const sample = createSampleImporterProject();
    service.saveProject(sample);
    const bridgeId = sample.bridges[0]!.id;
    const onOpenInPhase35 = vi.fn();
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const click = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      const element = originalCreateElement(tagName);
      if (tagName === "a") {
        element.click = click;
      }
      return element;
    });

    render(
      <ExportPanel
        projectId={sample.id}
        bridgeId={bridgeId}
        onBack={() => undefined}
        onOpenInPhase35={onOpenInPhase35}
      />,
    );

    act(() => {
      (document.querySelector("[data-testid=export-panel-download-json]") as HTMLButtonElement).click();
    });

    expect(onOpenInPhase35).not.toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalled();
  });

  it("Phase 3.5 setup route resolves for navigation after export", () => {
    expect(resolveLinerUiRoutePath("liner.setup")).toBe("/pro/liner/setup");
  });
});
