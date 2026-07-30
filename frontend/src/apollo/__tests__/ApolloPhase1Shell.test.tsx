// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { createDefaultProject } from "../../data/defaultProject";
import { ApolloPhase1Shell } from "../ApolloPhase1Shell";
import type { ApolloPhase1FeatureFlags } from "../featureFlag";
import type { ApolloVisualizationModel } from "../visualization";
import type { ProjectModel } from "../../types";
import { createApollo200mContinuousBridgeSample } from "../sampleProjects";

vi.mock("../../viewer/Viewer3D", () => ({
  Viewer3D: ({
    project,
    selection,
    apolloVisualizationModel,
    apolloSelectionKeys,
    apolloValidationHighlight,
    viewPanelOpen,
    onSelectionChange,
  }: {
    project: { nodes: unknown[]; members: unknown[] };
    selection?: { type: string; id: string } | null;
    apolloVisualizationModel?: ApolloVisualizationModel | null;
    apolloSelectionKeys?: readonly string[];
    apolloValidationHighlight?: { targetKey: string; severity: string } | null;
    viewPanelOpen?: boolean;
    onSelectionChange?: (selection: { type: "node" | "member" | "support"; id: string } | null) => void;
  }) => (
    <div
      data-testid="mock-viewer3d"
      data-selection={selection ? `${selection.type}:${selection.id}` : "none"}
      data-selection-keys={apolloSelectionKeys?.join(",") ?? ""}
      data-validation-highlight={
        apolloValidationHighlight
          ? `${apolloValidationHighlight.targetKey}:${apolloValidationHighlight.severity}`
          : "none"
      }
      data-visualization-elements={apolloVisualizationModel?.elements.length ?? 0}
      data-view-panel-open={viewPanelOpen === false ? "false" : "true"}
    >
      {project.nodes.length}/{project.members.length}
      <button type="button" data-testid="mock-viewer-select-node" onClick={() => onSelectionChange?.({ type: "node", id: "N-A1" })}>
        select node
      </button>
      <button type="button" data-testid="mock-viewer-select-member" onClick={() => onSelectionChange?.({ type: "member", id: "MG0" })}>
        select member
      </button>
      <button type="button" data-testid="mock-viewer-select-support" onClick={() => onSelectionChange?.({ type: "support", id: "SUP-1" })}>
        select support
      </button>
    </div>
  ),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mountedRoots: Array<{ root: ReturnType<typeof createRoot>; container: HTMLElement }> = [];

afterEach(() => {
  for (const entry of mountedRoots.splice(0)) {
    act(() => {
      entry.root.unmount();
    });
    entry.container.remove();
  }
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function setInputValue(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const prototype =
    input instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
  const valueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  valueSetter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

const DEFAULT_FLAGS: ApolloPhase1FeatureFlags = {
  nnEnabled: true,
  numericReleaseBlocked: true,
  showProvisionalStatus: true,
  disableResultPublication: true,
  disableNumericExecution: true,
};

function defaultGuardedAction(
  _message: string,
  action: () => void | Promise<void>,
): Promise<boolean> {
  return Promise.resolve(action()).then(() => true);
}

function renderShell(
  props?: Partial<{
    onReturnToPro: () => void;
    project: ProjectModel;
    flags: ApolloPhase1FeatureFlags;
    onProjectChange: (nextProject: ProjectModel) => void;
    onResetProjectHistory: (nextProject: ProjectModel) => void;
    onCloseHistoryTransaction: () => void;
    onUndo: () => void;
    onRedo: () => void;
    onAuditEvent: (message: string) => void;
    onSaveProject: () => Promise<boolean>;
    onReloadProject: () => Promise<boolean>;
    isDirty: boolean;
    runGuardedAction: (
      message: string,
      action: () => void | Promise<void>,
      options?: { readonly revertOnDiscard?: boolean },
    ) => Promise<boolean>;
    onEstablishBaseline: (nextProject: ProjectModel) => void;
  }>,
) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedRoots.push({ root, container });
  act(() => {
    root.render(
      <ApolloPhase1Shell
        project={props?.project ?? createDefaultProject()}
        flags={props?.flags ?? DEFAULT_FLAGS}
        canUndo={false}
        canRedo={false}
        onProjectChange={props?.onProjectChange ?? (() => undefined)}
        onResetProjectHistory={props?.onResetProjectHistory ?? props?.onProjectChange ?? (() => undefined)}
        onCloseHistoryTransaction={props?.onCloseHistoryTransaction ?? (() => undefined)}
        onUndo={props?.onUndo ?? (() => undefined)}
        onRedo={props?.onRedo ?? (() => undefined)}
        onReturnToPro={props?.onReturnToPro ?? (() => undefined)}
        onAuditEvent={props?.onAuditEvent}
        isDirty={props?.isDirty ?? false}
        onSaveProject={props?.onSaveProject ?? (async () => true)}
        onReloadProject={props?.onReloadProject ?? (async () => true)}
        runGuardedAction={props?.runGuardedAction ?? defaultGuardedAction}
        onEstablishBaseline={props?.onEstablishBaseline ?? (() => undefined)}
      />,
    );
  });
  return { container, root };
}

function renderStatefulShell(initialProject: ProjectModel = createDefaultProject()) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedRoots.push({ root, container });

  function Harness() {
    const [project, setProject] = useState(initialProject);
    return (
      <ApolloPhase1Shell
        project={project}
        flags={DEFAULT_FLAGS}
        canUndo={false}
        canRedo={false}
        onProjectChange={setProject}
        onResetProjectHistory={setProject}
        onCloseHistoryTransaction={() => undefined}
        onUndo={() => undefined}
        onRedo={() => undefined}
        onReturnToPro={() => undefined}
        onSaveProject={async () => true}
        onReloadProject={async () => true}
        isDirty={false}
        runGuardedAction={defaultGuardedAction}
        onEstablishBaseline={() => undefined}
      />
    );
  }

  act(() => {
    root.render(<Harness />);
  });
  return { container, root };
}

function clickButtonByText(container: HTMLElement, text: string) {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text),
  ) as HTMLButtonElement | undefined;
  if (!button) {
    throw new Error(`Button not found: ${text}`);
  }
  act(() => {
    button.click();
  });
}

describe("ApolloPhase1Shell", () => {
  it("shows the guided start screen in Japanese and highlights the sample path", () => {
    const { container } = renderShell();
    expect(container.querySelector("[data-testid='apollo-start-screen']")).not.toBeNull();
    expect(container.textContent).toContain("Apollo 橋梁骨組み入力");
    expect(container.textContent).toContain("サンプル橋梁から始める");
    expect(container.textContent).toContain("新しい橋梁を作成");
    expect(container.textContent).toContain("保存済みデータを開く");
    expect(container.textContent).toContain("おすすめ");
  });

  it("loads the 200m sample and shows the sample guide with the new wording", () => {
    const updates: ProjectModel[] = [];
    const { container } = renderShell({
      onProjectChange: (nextProject) => updates.push(nextProject),
    });

    act(() => {
      (container.querySelector("[data-testid='apollo-open-sample-selection']") as HTMLButtonElement).click();
    });
    expect(container.querySelector("[data-testid='apollo-sample-selection']")).not.toBeNull();
    expect(container.textContent).toContain("このサンプルを読み込む");

    act(() => {
      (container.querySelector("[data-testid='apollo-load-standard-sample']") as HTMLButtonElement).click();
    });

    expect(container.querySelector("[data-testid='apollo-sample-loaded-guide']")).not.toBeNull();
    expect(container.querySelector("[data-testid='apollo-sample-guide-primary-next']")?.textContent).toContain("次へ（基本情報）");
    expect(updates).toHaveLength(1);
    const next = updates[0];
    expect(next.apolloPhase1Unit2?.nodes).toHaveLength(6);
    expect(next.apolloPhase1Unit2?.members).toHaveLength(5);
    expect(next.apolloPhase1Unit2?.supports).toHaveLength(6);
    expect(next.apolloPhase1Unit2?.materialReferences.length).toBeGreaterThanOrEqual(1);
  });

  it("shows completion guidance and save explanations only after a valid walkthrough", () => {
    const { container } = renderStatefulShell();

    clickButtonByText(container, "サンプルを選ぶ");
    clickButtonByText(container, "このサンプルを読み込む");
    clickButtonByText(container, "次へ（基本情報）");
    clickButtonByText(container, "次へ: 節点を確認");
    clickButtonByText(container, "次へ: 入力チェック");
    clickButtonByText(container, "次へ: 入力チェック");
    clickButtonByText(container, "次へ: 入力チェック");
    clickButtonByText(container, "次へ: 入力チェック");

    expect(container.querySelector("[data-testid='apollo-validation-screen']")).not.toBeNull();
    expect(container.querySelector("[data-testid='apollo-completion-card']")).not.toBeNull();
    expect(container.textContent).toContain("橋梁モデルの作成が完了しました");
    expect(container.textContent).toContain("現在は橋梁モデル入力まで利用できます。構造解析および解析結果の表示は未実装です。");
    expect(container.textContent).toContain("保存先は保存時に選択し、他のPCへ持ち出せます。");
    expect(container.textContent).toContain("このパソコンのブラウザ保存領域へ一時保存します。");
  });

  it("switches to list mode without resetting project data", () => {
    const project = createDefaultProject();
    const { container } = renderShell({ project });

    act(() => {
      (container.querySelectorAll("button")).forEach(() => undefined);
      (Array.from(container.querySelectorAll("button")) as HTMLButtonElement[]).find((button) =>
        button.textContent?.includes("一覧編集モード"),
      )?.click();
    });

    expect(container.querySelector("[data-testid='apollo-list-mode']")).not.toBeNull();
    const nameInput = container.querySelector("[data-testid='apollo-project-name-input']") as HTMLInputElement;
    expect(nameInput.value).toBe(project.project.name);
  });

  it("passes the derived Apollo visualization model to Viewer3D", () => {
    const { container } = renderShell({ project: createApollo200mContinuousBridgeSample() });
    clickButtonByText(container, "一覧編集モード");
    const viewer = container.querySelector("[data-testid='mock-viewer3d']");
    expect(viewer).not.toBeNull();
    expect(viewer?.getAttribute("data-visualization-elements")).not.toBe("0");
    expect(viewer?.getAttribute("data-view-panel-open")).toBe("false");
  });

  it("downloads Apollo STL and manifest from the list mode topology shell", () => {
    vi.useFakeTimers();
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:apollo");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const { container } = renderShell({ project: createApollo200mContinuousBridgeSample() });

    clickButtonByText(container, "一覧編集モード");
    const exportButton = container.querySelector("[data-testid='apollo-export-stl']") as HTMLButtonElement | null;
    expect(exportButton).not.toBeNull();
    act(() => {
      exportButton?.click();
      vi.runAllTimers();
    });

    expect(createObjectURL).toHaveBeenCalledTimes(2);
    expect(revokeObjectURL).toHaveBeenCalledTimes(2);
    expect(click).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain("Apollo STL出力を開始しました");
  });

  it("shows basics screen and Japanese save status", () => {
    const { container } = renderStatefulShell(createApollo200mContinuousBridgeSample());

    clickButtonByText(container, "一覧編集モード");
    clickButtonByText(container, "ガイド付きモード");
    clickButtonByText(container, "サンプルを選ぶ");
    clickButtonByText(container, "このサンプルを読み込む");
    clickButtonByText(container, "次へ（基本情報）");

    expect(container.querySelector("[data-testid='apollo-basics-screen']")).not.toBeNull();
    expect(container.textContent).toContain("保存状態: 保存済み");
    expect(container.textContent).not.toContain("スキーマ:");
  });

  it("shows each editor tab in guided mode", () => {
    const { container } = renderShell();

    act(() => {
      (Array.from(container.querySelectorAll("button")) as HTMLButtonElement[]).find((button) =>
        button.textContent?.includes("新規作成"),
      )?.click();
    });
    act(() => {
      (Array.from(container.querySelectorAll("button")) as HTMLButtonElement[]).find((button) =>
        button.textContent?.includes("次へ: 節点を確認"),
      )?.click();
    });

    expect(container.querySelector("[data-testid='apollo-node-editor']")).not.toBeNull();
    act(() => {
      (container.querySelector("[data-testid='apollo-add-node']") as HTMLButtonElement).click();
    });
    act(() => {
      (Array.from(container.querySelectorAll("button")) as HTMLButtonElement[]).find((button) =>
        button.textContent?.includes("次へ: 入力チェック"),
      )?.click();
    });
    expect(container.querySelector("[data-testid='apollo-member-editor']")).not.toBeNull();

    act(() => {
      (Array.from(container.querySelectorAll("button")) as HTMLButtonElement[]).find((button) =>
        button.textContent?.includes("次へ: 入力チェック"),
      )?.click();
    });
    expect(container.querySelector("[data-testid='apollo-support-editor']")).not.toBeNull();

    act(() => {
      (Array.from(container.querySelectorAll("button")) as HTMLButtonElement[]).find((button) =>
        button.textContent?.includes("次へ: 入力チェック"),
      )?.click();
    });
    expect(container.querySelector("[data-testid='apollo-material-editor']")).not.toBeNull();
  });

  it("shows validation screen and numeric guards remain blocked", () => {
    const { container } = renderShell();

    act(() => {
      (Array.from(container.querySelectorAll("button")) as HTMLButtonElement[]).find((button) =>
        button.textContent?.includes("一覧編集モード"),
      )?.click();
    });

    expect(container.querySelector("[data-testid='apollo-validation-shell']")).not.toBeNull();

    const numericGuard = container.querySelector("[data-testid='apollo-numeric-execution-guard']") as HTMLButtonElement;
    const publicationGuard = container.querySelector("[data-testid='apollo-result-publication-guard']") as HTMLButtonElement;
    expect(numericGuard.getAttribute("data-guard-blocked")).toBe("true");
    expect(publicationGuard.getAttribute("data-guard-blocked")).toBe("true");
  });

  it("preserves existing invalid validation codes for broken projects", () => {
    const broken = {
      ...createDefaultProject(),
      project: {
        ...createDefaultProject().project,
        name: "",
      },
      members: [
        {
          id: "BROKEN",
          nodeI: "MISSING-I",
          nodeJ: "MISSING-J",
          materialId: "MAT_DECK",
          sectionId: "SEC_DECK",
        },
      ],
      supports: [
        {
          nodeId: "MISSING-SUPPORT",
          ux: false,
          uy: false,
          uz: false,
          rx: false,
          ry: false,
          rz: false,
        },
      ],
    };
    const { container } = renderShell({ project: broken });

    act(() => {
      (Array.from(container.querySelectorAll("button")) as HTMLButtonElement[]).find((button) =>
        button.textContent?.includes("一覧編集モード"),
      )?.click();
    });

    expect(container.textContent).toContain("橋梁名を入力してください。");
    expect(container.textContent).toContain("参照切れ");
  });

  it("does not show the completion message when validation errors remain and marks the step bar", () => {
    const brokenSample = createApollo200mContinuousBridgeSample();
    brokenSample.project.name = "";
    if (brokenSample.apolloPhase1Unit2) {
      brokenSample.apolloPhase1Unit2.metadata.name = "";
    }
    const { container } = renderShell({ project: brokenSample });

    act(() => {
      (Array.from(container.querySelectorAll("button")) as HTMLButtonElement[]).find((button) =>
        button.textContent?.includes("一覧編集モード"),
      )?.click();
    });
    act(() => {
      (Array.from(container.querySelectorAll("button")) as HTMLButtonElement[]).find((button) =>
        button.textContent?.includes("ガイド付きモード"),
      )?.click();
    });
    clickButtonByText(container, "サンプルを選ぶ");
    clickButtonByText(container, "このサンプルを読み込む");
    clickButtonByText(container, "次へ（基本情報）");
    clickButtonByText(container, "次へ: 節点を確認");
    clickButtonByText(container, "次へ: 入力チェック");
    clickButtonByText(container, "次へ: 入力チェック");
    clickButtonByText(container, "次へ: 入力チェック");
    clickButtonByText(container, "次へ: 入力チェック");

    expect(container.querySelector("[data-testid='apollo-completion-card']")).toBeNull();
    expect(container.textContent).toContain("橋梁名を入力してください。");
    expect(container.querySelector("[data-step-status='error']")).not.toBeNull();
  });

  it("updates project metadata in Japanese screens", () => {
    const updates: ProjectModel[] = [];
    const { container } = renderShell({
      onProjectChange: (nextProject) => updates.push(nextProject),
    });

    act(() => {
      (Array.from(container.querySelectorAll("button")) as HTMLButtonElement[]).find((button) =>
        button.textContent?.includes("新規作成"),
      )?.click();
    });

    const input = container.querySelector("[data-testid='apollo-project-name-input']") as HTMLInputElement;
    act(() => {
      setInputValue(input, "Apollo Route Persistence");
    });

    expect(updates.at(-1)?.project.name).toBe("Apollo Route Persistence");
  });

  it("clears viewer focus when multiple rows are selected", () => {
    const { container } = renderStatefulShell(createApollo200mContinuousBridgeSample());

    clickButtonByText(container, "一覧編集モード");

    const first = container.querySelector("[data-testid='apollo-node-select-N-A1']") as HTMLButtonElement;
    const second = container.querySelector("[data-testid='apollo-node-select-N-P1']") as HTMLButtonElement;

    act(() => {
      first.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(container.querySelector("[data-testid='mock-viewer3d']")?.getAttribute("data-selection")).toBe("node:N-A1");

    act(() => {
      second.dispatchEvent(new MouseEvent("click", { bubbles: true, ctrlKey: true }));
    });
    expect(container.querySelector("[data-testid='mock-viewer3d']")?.getAttribute("data-selection")).toBe("none");
    expect(container.querySelector("[data-testid='mock-viewer3d']")?.getAttribute("data-selection-keys")).toContain("node:N-A1");
    expect(container.querySelector("[data-testid='mock-viewer3d']")?.getAttribute("data-selection-keys")).toContain("node:N-P1");
    expect(container.querySelector("[data-testid='apollo-selection-count']")?.textContent).toContain("2");
  });

  it("projects a support selection to the viewer and accepts support picks from the viewer", () => {
    const { container } = renderStatefulShell(createApollo200mContinuousBridgeSample());

    clickButtonByText(container, "一覧編集モード");
    clickButtonByText(container, "支点");

    const supportSelect = container.querySelector("[data-testid='apollo-support-select-SUP-1']") as HTMLButtonElement;
    act(() => {
      supportSelect.click();
    });

    expect(container.querySelector("[data-testid='mock-viewer3d']")?.getAttribute("data-selection")).toBe("support:SUP-1");
    expect(container.querySelector("[data-testid='mock-viewer3d']")?.getAttribute("data-selection-keys")).toBe("support:SUP-1");

    act(() => {
      (container.querySelector("[data-testid='mock-viewer-select-support']") as HTMLButtonElement).click();
    });

    expect(container.querySelector("[data-testid='mock-viewer3d']")?.getAttribute("data-selection")).toBe("support:SUP-1");
    expect(container.querySelector("[data-testid='apollo-selection-count']")?.textContent).toContain("1");
  });

  it("filters visible rows with normalized search and clears back to the full set", () => {
    const project = createApollo200mContinuousBridgeSample();
    if (project.apolloPhase1Unit2) {
      project.apolloPhase1Unit2.members[0]!.label = "主桁Ｇ１";
    }
    const { container } = renderStatefulShell(project);

    clickButtonByText(container, "一覧編集モード");
    clickButtonByText(container, "部材");

    const query = container.querySelector("[data-testid='apollo-search-query']") as HTMLInputElement;
    act(() => {
      setInputValue(query, " g1 ");
    });

    expect(container.textContent).toContain("主桁Ｇ１");
    expect(container.querySelector("[data-testid='apollo-visible-count']")?.textContent).toContain("1");

    act(() => {
      (container.querySelector("[data-testid='apollo-search-clear']") as HTMLButtonElement).click();
    });

    expect(container.querySelector("[data-testid='apollo-visible-count']")?.textContent).toContain("5");
  });

  it("applies bulk edit to a homogeneous selection", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const { container } = renderStatefulShell(createApollo200mContinuousBridgeSample());

    clickButtonByText(container, "一覧編集モード");

    const first = container.querySelector("[data-testid='apollo-node-select-N-A1']") as HTMLButtonElement;
    const second = container.querySelector("[data-testid='apollo-node-select-N-P1']") as HTMLButtonElement;

    act(() => {
      first.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      second.dispatchEvent(new MouseEvent("click", { bubbles: true, ctrlKey: true }));
    });

    const field = container.querySelector("[data-testid='apollo-bulk-edit-field']") as HTMLSelectElement;
    const value = container.querySelector("[data-testid='apollo-bulk-edit-text']") as HTMLInputElement;
    act(() => {
      field.value = "label";
      field.dispatchEvent(new Event("change", { bubbles: true }));
      setInputValue(value, "新河川橋");
    });
    act(() => {
      (container.querySelector("[data-testid='apollo-bulk-edit-apply']") as HTMLButtonElement).click();
    });

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("新河川橋");
    confirmSpy.mockRestore();
  });

  it("blocks bulk edit when fewer than two selected rows are visible while keeping hidden selection", () => {
    const { container } = renderStatefulShell(createApollo200mContinuousBridgeSample());

    clickButtonByText(container, "一覧編集モード");

    const first = container.querySelector("[data-testid='apollo-node-select-N-A1']") as HTMLButtonElement;
    const second = container.querySelector("[data-testid='apollo-node-select-N-P1']") as HTMLButtonElement;
    const third = container.querySelector("[data-testid='apollo-node-select-N-P2']") as HTMLButtonElement;

    act(() => {
      first.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      second.dispatchEvent(new MouseEvent("click", { bubbles: true, ctrlKey: true }));
      third.dispatchEvent(new MouseEvent("click", { bubbles: true, ctrlKey: true }));
    });

    expect(container.querySelector("[data-testid='apollo-selection-count']")?.textContent).toContain("3");

    const query = container.querySelector("[data-testid='apollo-search-query']") as HTMLInputElement;
    act(() => {
      setInputValue(query, "A1");
    });

    expect(container.querySelector("[data-testid='apollo-bulk-edit-count']")?.textContent).toContain("1");
    expect(container.querySelector("[data-testid='apollo-bulk-edit-blocked']")?.textContent).toContain(
      "2件以上",
    );
    expect(container.querySelector("[data-testid='apollo-selection-count']")?.textContent).toContain("3");
  });

  it("applies bulk edit only to visible selected rows", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const { container } = renderStatefulShell(createApollo200mContinuousBridgeSample());

    clickButtonByText(container, "一覧編集モード");

    const first = container.querySelector("[data-testid='apollo-node-select-N-A1']") as HTMLButtonElement;
    const second = container.querySelector("[data-testid='apollo-node-select-N-P1']") as HTMLButtonElement;
    const third = container.querySelector("[data-testid='apollo-node-select-N-P2']") as HTMLButtonElement;

    act(() => {
      first.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      second.dispatchEvent(new MouseEvent("click", { bubbles: true, ctrlKey: true }));
      third.dispatchEvent(new MouseEvent("click", { bubbles: true, ctrlKey: true }));
    });

    const query = container.querySelector("[data-testid='apollo-search-query']") as HTMLInputElement;
    act(() => {
      setInputValue(query, "P");
    });

    expect(container.querySelector("[data-testid='apollo-bulk-edit-count']")?.textContent).toContain("2");

    const field = container.querySelector("[data-testid='apollo-bulk-edit-field']") as HTMLSelectElement;
    const value = container.querySelector("[data-testid='apollo-bulk-edit-text']") as HTMLInputElement;
    act(() => {
      field.value = "label";
      field.dispatchEvent(new Event("change", { bubbles: true }));
      setInputValue(value, "一括名称");
    });
    act(() => {
      (container.querySelector("[data-testid='apollo-bulk-edit-apply']") as HTMLButtonElement).click();
    });

    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining("2件"));

    act(() => {
      (container.querySelector("[data-testid='apollo-search-clear']") as HTMLButtonElement).click();
    });

    const nodeLabelCell = (nodeId: string) => {
      const row = container
        .querySelector(`[data-testid='apollo-node-select-${nodeId}']`)
        ?.closest("tr");
      return row?.querySelectorAll("td")[1]?.textContent ?? "";
    };

    expect(nodeLabelCell("N-A1")).toBe("A1");
    expect(nodeLabelCell("N-P1")).toBe("一括名称");
    expect(nodeLabelCell("N-P2")).toBe("一括名称");
    confirmSpy.mockRestore();
  });

  it("selects only visible rows with Ctrl/Cmd+A after filtering", () => {
    const { container } = renderStatefulShell(createApollo200mContinuousBridgeSample());

    clickButtonByText(container, "一覧編集モード");

    const query = container.querySelector("[data-testid='apollo-search-query']") as HTMLInputElement;
    act(() => {
      setInputValue(query, "A1");
    });

    expect(container.querySelector("[data-testid='apollo-visible-count']")?.textContent).toContain("1");

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "a", ctrlKey: true, bubbles: true }));
    });

    expect(container.querySelector("[data-testid='apollo-selection-count']")?.textContent).toContain("1");
  });

  it("navigates validation issues and moves focus to the target field", async () => {
    const brokenSample = createApollo200mContinuousBridgeSample();
    if (brokenSample.apolloPhase1Unit2) {
      brokenSample.apolloPhase1Unit2.members[0]!.materialRefId = "MISSING-MATERIAL";
    }
    const { container } = renderStatefulShell(brokenSample);
    const focusSpy = vi.spyOn(HTMLElement.prototype, "focus");

    clickButtonByText(container, "一覧編集モード");

    const navigateButton = Array.from(
      container.querySelectorAll("[data-testid='apollo-validation-list'] li"),
    ).find((item) => item.textContent?.includes("材料参照"))?.querySelector("button") as
      | HTMLButtonElement
      | undefined;
    expect(navigateButton).toBeTruthy();

    await act(async () => {
      navigateButton?.click();
      for (let attempt = 0; attempt < 20 && focusSpy.mock.calls.length === 0; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 0));
      }
    });

    expect(container.querySelector("[data-testid='apollo-member-editor']")).not.toBeNull();
    expect(container.querySelector("[data-focus-key='member-material']")).not.toBeNull();
    expect(container.querySelector("[data-testid='mock-viewer3d']")?.getAttribute("data-validation-highlight")).toBe(
      "member:M-01:error",
    );
    expect(focusSpy).toHaveBeenCalled();
    focusSpy.mockRestore();
  });

  it("clears validation highlight after a normal row selection", async () => {
    const brokenSample = createApollo200mContinuousBridgeSample();
    if (brokenSample.apolloPhase1Unit2) {
      brokenSample.apolloPhase1Unit2.members[0]!.materialRefId = "MISSING-MATERIAL";
    }
    const { container } = renderStatefulShell(brokenSample);

    clickButtonByText(container, "一覧編集モード");

    const navigateButton = Array.from(
      container.querySelectorAll("[data-testid='apollo-validation-list'] li"),
    ).find((item) => item.textContent?.includes("材料参照"))?.querySelector("button") as
      | HTMLButtonElement
      | undefined;
    expect(navigateButton).toBeTruthy();

    await act(async () => {
      navigateButton?.click();
    });

    expect(container.querySelector("[data-testid='mock-viewer3d']")?.getAttribute("data-validation-highlight")).toBe(
      "member:M-01:error",
    );

    act(() => {
      (container.querySelector("[data-testid='apollo-member-select-M-01']") as HTMLButtonElement).click();
    });

    expect(container.querySelector("[data-testid='mock-viewer3d']")?.getAttribute("data-validation-highlight")).toBe(
      "none",
    );
  });

  it("copies only visible selected rows while filter-hidden selection is retained", () => {
    const { container } = renderStatefulShell(createApollo200mContinuousBridgeSample());
    clickButtonByText(container, "一覧編集モード");

    const first = container.querySelector("[data-testid='apollo-node-select-N-P1']") as HTMLButtonElement;
    const second = container.querySelector("[data-testid='apollo-node-select-N-P2']") as HTMLButtonElement;
    act(() => {
      first.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      second.dispatchEvent(new MouseEvent("click", { bubbles: true, ctrlKey: true }));
    });
    expect(container.querySelector("[data-testid='apollo-selection-count']")?.textContent).toContain("2");

    const query = container.querySelector("[data-testid='apollo-search-query']") as HTMLInputElement;
    act(() => {
      setInputValue(query, "P1");
    });
    expect(container.querySelector("[data-testid='apollo-visible-count']")?.textContent).toContain("1");
    expect(container.querySelector("[data-testid='apollo-selection-count']")?.textContent).toContain("2");

    act(() => {
      (container.querySelector("[data-testid='apollo-copy-selection']") as HTMLButtonElement).click();
    });
    expect(container.textContent).toContain("1件のnodeをApollo内部クリップボードへコピーしました。");
  });
});
