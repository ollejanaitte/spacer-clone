// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BusinessListPage } from "../pages/BusinessListPage";
import { NewProjectPage } from "../pages/NewProjectPage";
import { EditProjectPage } from "../pages/EditProjectPage";
import { ProjectTopPage } from "../pages/ProjectTopPage";
import { BusinessForm, type BusinessFormValues } from "../components/BusinessForm";
import { getProjectManager, resetProjectManagerForTest } from "../project/projectManagerInstance";

async function render(node: ReactNode): Promise<Root> {
  await getProjectManager().restoreFromPersistence();
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(node);
  });
  return root;
}

function cleanup(root: Root) {
  act(() => {
    root.unmount();
  });
}

function changeValue(testId: string, value: string) {
  const el = document.querySelector(`[data-testid="${testId}"]`) as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set;
  act(() => {
    setter!.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function changeSelect(testId: string, value: string) {
  const el = document.querySelector(`[data-testid="${testId}"]`) as HTMLSelectElement;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value")!.set;
  act(() => {
    setter!.call(el, value);
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

beforeEach(() => {
  resetProjectManagerForTest();
});

afterEach(() => {
  document.body.innerHTML = "";
  window.history.pushState({}, "", "/app");
  resetProjectManagerForTest();
});

describe("BusinessListPage", () => {
  it("空状態を表示し、新規作成・読込ボタンを備える", async () => {
    const root = await render(<BusinessListPage />);
    expect(document.querySelector('[data-testid="business-list-empty"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="new-project-button"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="load-business-button"]')).toBeTruthy();
    cleanup(root);
  });

  it("作成済みProjectを行に表示し、内部IDと業務件番を別管理する", async () => {
    const manager = getProjectManager();
    manager.createProject({
      name: "道路詳細設計業務",
      businessNumber: "B-2026-001",
      designStage: "road-detailed",
    });
    const root = await render(<BusinessListPage />);
    expect(document.querySelector('[data-testid="business-table"]')).toBeTruthy();
    const rows = document.querySelectorAll('[data-testid="business-row"]');
    expect(rows.length).toBe(1);
    const name = rows[0].querySelector('[data-testid="business-name"]')?.textContent;
    const number = rows[0].querySelector('[data-testid="business-number"]')?.textContent;
    const stage = rows[0].querySelector('[data-testid="business-stage"]')?.textContent;
    const id = rows[0].querySelector('[data-testid="business-internal-id"]')?.textContent;
    expect(name).toBe("道路詳細設計業務");
    expect(number).toBe("B-2026-001");
    expect(stage).toBe("道路詳細設計");
    expect(id).toBeTruthy();
    expect(id).not.toBe("B-2026-001");
    cleanup(root);
  });

  it("業務検索で絞り込む", async () => {
    const manager = getProjectManager();
    manager.createProject({ name: "橋梁予備設計業務", businessNumber: "B-001", designStage: "bridge-preliminary" });
    manager.createProject({ name: "道路詳細設計業務", businessNumber: "B-002", designStage: "road-detailed" });
    const root = await render(<BusinessListPage />);
    changeValue("business-search-input", "道路");
    expect(document.querySelectorAll('[data-testid="business-row"]').length).toBe(1);
    expect(document.querySelector('[data-testid="business-name"]')?.textContent).toContain("道路詳細");
    cleanup(root);
  });
});

describe("BusinessForm → NewProjectPage", () => {
  it("新規作成フォームで作成すると一覧に反映される", async () => {
    let submitted: BusinessFormValues | undefined;
    const root = await render(
      <BusinessForm
        initial={{ businessNumber: "", name: "", designStage: "road-preliminary", designStageCustomLabel: "" }}
        submitLabel="作成"
        onSubmit={(v) => {
          submitted = v;
        }}
        onCancel={() => {}}
      />,
    );
    changeValue("form-business-number", "B-2026-010");
    changeValue("form-name", "耐震照査業務");
    changeSelect("form-design-stage", "other");
    changeValue("form-design-stage-custom", "耐震照査");
    act(() => {
      (document.querySelector('[data-testid="form-submit"]') as HTMLButtonElement).click();
    });
    expect(submitted).toEqual({
      businessNumber: "B-2026-010",
      name: "耐震照査業務",
      designStage: "other",
      designStageCustomLabel: "耐震照査",
    });
    cleanup(root);
  });

  it("NewProjectPageはProjectManager経由で作成する", async () => {
    const root = await render(<NewProjectPage />);
    changeValue("form-business-number", "B-777");
    changeValue("form-name", "作成テスト業務");
    act(() => {
      (document.querySelector('[data-testid="form-submit"]') as HTMLButtonElement).click();
    });
    const projects = getProjectManager().listProjects();
    expect(projects.length).toBe(1);
    expect(projects[0].name).toBe("作成テスト業務");
    cleanup(root);
  });
});

describe("EditProjectPage", () => {
  it("編集フォームに既存値を表示し、保存で更新される", async () => {
    const manager = getProjectManager();
    const created = manager.createProject({
      name: "編集前業務",
      businessNumber: "B-100",
      designStage: "bridge-preliminary",
    });
    if (!created.ok) throw new Error("create failed");
    const root = await render(<EditProjectPage projectId={created.project.projectId} />);
    const nameInput = document.querySelector('[data-testid="form-name"]') as HTMLInputElement;
    const numberInput = document.querySelector('[data-testid="form-business-number"]') as HTMLInputElement;
    expect(nameInput.value).toBe("編集前業務");
    expect(numberInput.value).toBe("B-100");
    changeValue("form-name", "編集後業務");
    act(() => {
      (document.querySelector('[data-testid="form-submit"]') as HTMLButtonElement).click();
    });
    const updated = manager.getProject(created.project.projectId);
    expect(updated?.name).toBe("編集後業務");
    cleanup(root);
  });

  it("存在しないProjectではnot-foundを表示する", async () => {
    const root = await render(<EditProjectPage projectId="missing-project" />);
    expect(document.querySelector('[data-testid="edit-not-found"]')).toBeTruthy();
    cleanup(root);
  });
});

describe("BusinessListPage duplicate / delete", () => {
  it("複製で新しいProjectが作られ、元Projectは破壊されない", async () => {
    const manager = getProjectManager();
    const created = manager.createProject({
      name: "複製元業務",
      businessNumber: "B-500",
      designStage: "road-detailed",
    });
    if (!created.ok) throw new Error("create failed");
    const root = await render(<BusinessListPage />);
    act(() => {
      (document.querySelector('[data-testid="business-duplicate"]') as HTMLButtonElement).click();
    });
    expect(manager.listProjects()).toHaveLength(2);
    const original = manager.getProject(created.project.projectId);
    expect(original?.name).toBe("複製元業務");
    const duplicated = manager.listProjects().find((p) => p.projectId !== created.project.projectId);
    expect(duplicated?.name).toBe("複製元業務");
    expect(duplicated?.projectId).not.toBe(created.project.projectId);
    expect(document.querySelector('[data-testid="business-message"]')?.textContent).toContain("複製しました");
    cleanup(root);
  });

  it("削除は確認ダイアログを経て完全削除される", async () => {
    const manager = getProjectManager();
    const created = manager.createProject({
      name: "削除予定業務",
      businessNumber: "B-600",
      designStage: "bridge-preliminary",
    });
    if (!created.ok) throw new Error("create failed");
    const root = await render(<BusinessListPage />);

    // 削除ボタン → 確認ダイアログ表示
    act(() => {
      (document.querySelector('[data-testid="business-delete"]') as HTMLButtonElement).click();
    });
    expect(document.querySelector('[data-testid="delete-confirm"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="delete-confirm"]')?.textContent).toContain("削除予定業務");

    // キャンセルでは削除されない
    act(() => {
      (document.querySelector('[data-testid="delete-confirm-cancel"]') as HTMLButtonElement).click();
    });
    expect(manager.listProjects()).toHaveLength(1);

    // 再度削除 → 完全削除で消える
    act(() => {
      (document.querySelector('[data-testid="business-delete"]') as HTMLButtonElement).click();
    });
    act(() => {
      (document.querySelector('[data-testid="delete-confirm-ok"]') as HTMLButtonElement).click();
    });
    expect(manager.listProjects()).toHaveLength(0);
    expect(manager.getProject(created.project.projectId)).toBeUndefined();
    cleanup(root);
  });
});

describe("ProjectTopPage", () => {
  it("業務情報と9領域の入口を表示する", async () => {
    const manager = getProjectManager();
    const created = manager.createProject({
      name: "トップ表示業務",
      businessNumber: "B-700",
      designStage: "other",
      designStageCustomLabel: "耐震照査",
    });
    if (!created.ok) throw new Error("create failed");
    const root = await render(<ProjectTopPage projectId={created.project.projectId} />);
    expect(document.querySelector('[data-testid="project-top-name"]')?.textContent).toBe("トップ表示業務");
    expect(document.querySelector('[data-testid="project-top-number"]')?.textContent).toBe("B-700");
    expect(document.querySelector('[data-testid="project-top-stage"]')?.textContent).toBe("耐震照査");
    expect(document.querySelector('[data-testid="project-top-internal-id"]')?.textContent).toBe(created.project.projectId);
    const sections = document.querySelectorAll('[data-testid="project-top-sections"] li');
    expect(sections.length).toBe(9);
    cleanup(root);
  });
});
