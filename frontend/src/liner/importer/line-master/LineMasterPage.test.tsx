/**
 * @vitest-environment jsdom
 */
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultImporterProjectService } from "../ImporterProjectService";
import { createEmptyImporterProject } from "../factory";
import { clearImporterStorageForTests } from "../storage/importerStorage";
import { clearRecoveryStateForTests, getRecoveryInfo } from "../storage/recoveryManager";
import { LineMasterPage } from "./LineMasterPage";

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

describe("LineMasterPage", () => {
  beforeEach(() => {
    clearImporterStorageForTests();
    clearRecoveryStateForTests();
  });

  it("renders settings and supports row add, reorder, csv import, save, and recovery", () => {
    const service = defaultImporterProjectService;
    const project = service.createEmptyProject("Line Master Test");
    const withBridge = service.createBridge(project.id, "テスト橋");

    render(
      <LineMasterPage
        projectId={withBridge.id}
        bridgeId={withBridge.bridges[0]!.id}
        onBack={() => undefined}
      />,
    );

    expect(document.querySelector("[data-testid=line-master-page]")).not.toBeNull();
    expect(document.querySelector("[data-testid=line-master-set-name]")).not.toBeNull();

    act(() => {
      (document.querySelector("[data-testid=line-master-add-row]") as HTMLButtonElement).click();
    });
    expect(document.querySelectorAll("[data-testid^=line-master-row-]")).toHaveLength(1);

    act(() => {
      (document.querySelector("[data-testid=line-master-csv-open]") as HTMLButtonElement).click();
    });
    const textarea = document.querySelector(
      "[data-testid=line-master-csv-textarea]",
    ) as HTMLTextAreaElement;
    act(() => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )?.set;
      valueSetter?.call(textarea, "CL\nG1\nG2");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      textarea.dispatchEvent(new Event("change", { bubbles: true }));
    });
    act(() => {
      (document.querySelector("[data-testid=line-master-csv-apply]") as HTMLButtonElement).click();
    });
    expect(document.querySelectorAll("[data-testid^=line-master-row-]")).toHaveLength(4);

    const firstRow = document.querySelector("[data-testid^=line-master-row-]");
    const firstRowId = firstRow?.getAttribute("data-testid")?.replace("line-master-row-", "");
    if (firstRowId) {
      act(() => {
        (
          document.querySelector(
            `[data-testid=line-master-move-down-${firstRowId}]`,
          ) as HTMLButtonElement
        ).click();
      });
    }

    vi.spyOn(window, "confirm").mockReturnValue(true);
    act(() => {
      (document.querySelector("[data-testid=line-master-save]") as HTMLButtonElement).click();
    });

    const saved = service.loadProject(withBridge.id);
    expect(saved?.bridges[0]?.girderLineSets[0]?.lines.length).toBeGreaterThan(0);
    expect(saved?.savedSnapshots).toBeDefined();

    act(() => {
      root?.unmount();
    });

    expect(getRecoveryInfo()).toMatchObject({
      projectId: withBridge.id,
      lastEditedStep: "lineMaster",
      lastEditedRef: {
        bridgeId: withBridge.bridges[0]?.id,
      },
    });
  });

  it("opens help modal", () => {
    const service = defaultImporterProjectService;
    const project = service.createEmptyProject("Help Test");
    const withBridge = service.createBridge(project.id, "Help Bridge");

    render(
      <LineMasterPage
        projectId={withBridge.id}
        bridgeId={withBridge.bridges[0]!.id}
        onBack={() => undefined}
      />,
    );

    act(() => {
      (document.querySelector("[data-testid=line-master-help-open]") as HTMLButtonElement).click();
    });
    expect(document.querySelector("[data-testid=line-master-help-modal]")).not.toBeNull();
  });

  it("copies girder line set from previous bridge", () => {
    const service = defaultImporterProjectService;
    const project = service.createEmptyProject("Copy Test");
    const bridgeA = service.createBridge(project.id, "橋A");
    const bridgeAId = bridgeA.bridges[0]!.id;

    service.saveBridgeGirderLineSet(project.id, bridgeAId, {
      id: "gls-a",
      name: "CL",
      referenceMode: "pdf-row-master",
      appliesToSpanIds: [],
      lines: [
        { id: "line-a", label: "CL", role: "center", displayOrder: 0 },
        { id: "line-b", label: "G1", role: "girder", displayOrder: 1 },
      ],
    });

    const withBridgeB = service.createBridge(project.id, "橋B");
    const bridgeBId = withBridgeB.bridges[1]!.id;

    render(
      <LineMasterPage
        projectId={withBridgeB.id}
        bridgeId={bridgeBId}
        onBack={() => undefined}
      />,
    );

    vi.spyOn(window, "confirm").mockReturnValue(true);
    act(() => {
      (
        document.querySelector("[data-testid=line-master-copy-from-bridge]") as HTMLButtonElement
      ).click();
    });

    expect(document.querySelectorAll("[data-testid^=line-master-row-]")).toHaveLength(2);
    expect(host?.textContent ?? "").toContain("橋A から橋軸線設定をコピーしました");
  });

  it("removes a row after confirmation", () => {
    const service = defaultImporterProjectService;
    const project = service.createEmptyProject("Delete Test");
    const withBridge = service.createBridge(project.id, "Delete Bridge");

    render(
      <LineMasterPage
        projectId={withBridge.id}
        bridgeId={withBridge.bridges[0]!.id}
        onBack={() => undefined}
      />,
    );

    act(() => {
      (document.querySelector("[data-testid=line-master-add-row]") as HTMLButtonElement).click();
    });
    const row = document.querySelector("[data-testid^=line-master-row-]");
    const rowId = row?.getAttribute("data-testid")?.replace("line-master-row-", "");
    expect(rowId).toBeTruthy();

    vi.spyOn(window, "confirm").mockReturnValue(true);
    act(() => {
      (
        document.querySelector(`[data-testid=line-master-remove-${rowId}]`) as HTMLButtonElement
      ).click();
    });

    expect(document.querySelector("[data-testid=line-master-empty-row]")).not.toBeNull();
  });
});
