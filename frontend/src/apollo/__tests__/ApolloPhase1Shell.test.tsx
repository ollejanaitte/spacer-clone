// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { createDefaultProject } from "../../data/defaultProject";
import { ApolloPhase1Shell } from "../ApolloPhase1Shell";
import type { ApolloPhase1FeatureFlags } from "../featureFlag";
import type { ProjectModel } from "../../types";
import { createApollo200mContinuousBridgeSample } from "../sampleProjects";

vi.mock("../../viewer/Viewer3D", () => ({
  Viewer3D: ({ project }: { project: { nodes: unknown[]; members: unknown[] } }) => (
    <div data-testid="mock-viewer3d">
      {project.nodes.length}/{project.members.length}
    </div>
  ),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

function renderShell(
  props?: Partial<{
    onReturnToPro: () => void;
    project: ProjectModel;
    flags: ApolloPhase1FeatureFlags;
    onProjectChange: (nextProject: ProjectModel) => void;
    onAuditEvent: (message: string) => void;
    onSaveProject: () => Promise<boolean>;
    onReloadProject: () => Promise<boolean>;
    dirty: boolean;
  }>,
) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      <ApolloPhase1Shell
        project={props?.project ?? createDefaultProject()}
        flags={props?.flags ?? DEFAULT_FLAGS}
        onProjectChange={props?.onProjectChange ?? (() => undefined)}
        onReturnToPro={props?.onReturnToPro ?? (() => undefined)}
        onAuditEvent={props?.onAuditEvent}
        dirty={props?.dirty ?? false}
        onSaveProject={props?.onSaveProject ?? (async () => true)}
        onReloadProject={props?.onReloadProject ?? (async () => true)}
      />,
    );
  });
  return { container, root };
}

function renderStatefulShell(initialProject: ProjectModel = createDefaultProject()) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  function Harness() {
    const [project, setProject] = useState(initialProject);
    return (
      <ApolloPhase1Shell
        project={project}
        flags={DEFAULT_FLAGS}
        onProjectChange={setProject}
        onReturnToPro={() => undefined}
        onSaveProject={async () => true}
        onReloadProject={async () => true}
        dirty={false}
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
});
