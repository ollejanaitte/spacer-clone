// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { NextApp } from "../NextApp";
import {
  isNextAppPath,
  NEXT_BUSINESS_LIST_PATH,
  NEXT_HOME_PATH,
  NEXT_PROJECT_HOME_PATH,
  NEXT_QUICK_PATH,
  isQuickPath,
  isNewProjectPath,
  isEditProjectPath,
  editProjectPath,
  parseEditProjectId,
} from "../routes";
import { resetProjectManagerForTest, getProjectManager } from "../project/projectManagerInstance";

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

afterEach(() => {
  document.body.innerHTML = "";
  window.history.pushState({}, "", "/app");
  resetProjectManagerForTest();
});

describe("next/routes", () => {
  it("isNextAppPath は /app 配下を判定する", () => {
    expect(isNextAppPath("/app")).toBe(true);
    expect(isNextAppPath("/app/business")).toBe(true);
    expect(isNextAppPath("/pro")).toBe(false);
    expect(isNextAppPath("/")).toBe(false);
  });

  it("isQuickPath はクイック解析のみ判定する", () => {
    expect(isQuickPath("/app/quick")).toBe(true);
    expect(isQuickPath("/app/quick/x")).toBe(true);
    expect(isQuickPath("/app/business")).toBe(false);
  });

  it("新規作成・編集パスを判定する", () => {
    expect(isNewProjectPath("/app/business/new")).toBe(true);
    expect(isNewProjectPath("/app/business")).toBe(false);
    expect(isEditProjectPath("/app/business/abc/edit")).toBe(true);
    expect(editProjectPath("proj-001")).toBe("/app/business/proj-001/edit");
    expect(parseEditProjectId("/app/business/proj-001/edit")).toBe("proj-001");
    expect(parseEditProjectId("/app/business")).toBeUndefined();
  });
});

describe("NextApp Shell", () => {
  it("ホーム（/app）で業務から設計とクイック解析の2系統を表示する", async () => {
    window.history.pushState({}, "", NEXT_HOME_PATH);
    const root = await render(<NextApp />);
    expect(document.querySelector('[data-testid="next-app"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="next-brand"]')?.textContent).toContain("Project System");
    expect(document.querySelector('[data-testid="home-page"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="home-business-entry"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="home-quick-entry"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="home-go-business"]')?.textContent).toContain("業務一覧へ");
    expect(document.querySelector('[data-testid="home-go-quick"]')?.textContent).toContain("新規解析");
    expect(document.querySelector('[data-testid="home-recent-empty"]')).toBeTruthy();
    cleanup(root);
  });

  it("旧システムへの導線（nav-legacy）が存在しない", async () => {
    window.history.pushState({}, "", NEXT_HOME_PATH);
    const root = await render(<NextApp />);
    expect(document.querySelector('[data-testid="nav-legacy"]')).toBeNull();
    expect(document.querySelector(".next-nav")?.textContent).not.toContain("旧システムへ");
    cleanup(root);
  });

  it("業務一覧（空状態）を表示する", async () => {
    window.history.pushState({}, "", NEXT_BUSINESS_LIST_PATH);
    const root = await render(<NextApp />);
    expect(document.querySelector('[data-testid="business-list-empty"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="new-project-button"]')).toBeTruthy();
    cleanup(root);
  });

  it("Projectトップで業務情報と未実装セクションを明示する", async () => {
    const manager = getProjectManager();
    const created = manager.createProject({
      name: "トップ表示業務",
      businessNumber: "B-700",
      designStage: "road-detailed",
    });
    if (!created.ok) throw new Error("create failed");
    window.history.pushState({}, "", `${NEXT_PROJECT_HOME_PATH}/${created.project.projectId}`);
    const root = await render(<NextApp />);
    expect(document.querySelector('[data-testid="project-top-page"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="project-top-not-found"]')).toBeNull();
    expect(document.querySelector('[data-testid="project-top-name"]')?.textContent).toBe("トップ表示業務");
    expect(document.querySelector('[data-testid="section-road-todo"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="section-analysis-todo"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="section-cim-todo"]')).toBeTruthy();
    cleanup(root);
  });

  it("クイック解析はProjectから独立した入口を表示する", async () => {
    window.history.pushState({}, "", NEXT_QUICK_PATH);
    const root = await render(<NextApp />);
    expect(document.querySelector('[data-testid="quick-analysis-page"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="quick-analysis-placeholder"]')).toBeTruthy();
    cleanup(root);
  });

  it("新規作成ページで業務フォームを表示する", async () => {
    window.history.pushState({}, "", "/app/business/new");
    const root = await render(<NextApp />);
    expect(document.querySelector('[data-testid="new-project-page"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="business-form"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="form-business-number"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="form-name"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="form-design-stage"]')).toBeTruthy();
    cleanup(root);
  });

  it("業務データ読込ページ（Integrity Check入口）を表示する", async () => {
    window.history.pushState({}, "", "/app/business/load");
    const root = await render(<NextApp />);
    expect(document.querySelector('[data-testid="load-business-page"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="select-package-button"]')).toBeTruthy();
    cleanup(root);
  });
});
