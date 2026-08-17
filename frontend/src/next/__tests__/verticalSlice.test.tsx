// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextApp } from "../NextApp";
import {
  NEXT_BUSINESS_LIST_PATH,
  NEXT_HOME_PATH,
  NEXT_PROJECT_HOME_PATH,
  navigateTo,
} from "../routes";
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

function click(testId: string) {
  const el = document.querySelector(`[data-testid="${testId}"]`) as HTMLElement;
  act(() => {
    el.click();
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

beforeEach(() => {
  resetProjectManagerForTest();
});

afterEach(() => {
  document.body.innerHTML = "";
  window.history.pushState({}, "", "/app");
  resetProjectManagerForTest();
});

describe("R1-03 vertical slice: home -> business -> create -> open -> project top", () => {
  it("新ホームから業務一覧へ移動できる", async () => {
    window.history.pushState({}, "", NEXT_HOME_PATH);
    const root = await render(<NextApp />);
    expect(document.querySelector('[data-testid="home-page"]')).toBeTruthy();
    click("home-go-business");
    expect(document.querySelector('[data-testid="business-list-page"]')).toBeTruthy();
    cleanup(root);
  });

  it("業務一覧から新規作成フォームへ進める", async () => {
    window.history.pushState({}, "", NEXT_BUSINESS_LIST_PATH);
    const root = await render(<NextApp />);
    click("new-project-button");
    expect(document.querySelector('[data-testid="new-project-page"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="business-form"]')).toBeTruthy();
    cleanup(root);
  });

  it("新規作成後に業務一覧へ戻り、業務一覧に反映される", async () => {
    window.history.pushState({}, "", "/app/business/new");
    const root = await render(<NextApp />);
    changeValue("form-business-number", "VERT-001");
    changeValue("form-name", "縦断テスト業務");
    click("form-submit");
    expect(document.querySelector('[data-testid="business-list-page"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="business-table"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="business-name"]')?.textContent).toBe("縦断テスト業務");
    cleanup(root);
  });

  it("業務を開くでProjectトップへ遷移し、PDF準拠7モジュールが表示される", async () => {
    const manager = getProjectManager();
    const created = manager.createProject({
      name: "縦断開く業務",
      businessNumber: "VERT-002",
      designStage: "bridge-detailed",
    });
    if (!created.ok) throw new Error("create failed");

    window.history.pushState({}, "", NEXT_BUSINESS_LIST_PATH);
    const root = await render(<NextApp />);
    click("business-open");
    expect(document.querySelector('[data-testid="project-top-page"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="project-top-name"]')?.textContent).toBe("縦断開く業務");
    expect(document.querySelectorAll('[data-testid="project-modules"] li').length).toBe(7);
    cleanup(root);
  });

  it("ホームの最近使用したデータに作成済みProjectが表示される", async () => {
    const manager = getProjectManager();
    manager.createProject({
      name: "最近使用業務",
      businessNumber: "REC-001",
      designStage: "road-preliminary",
    });

    window.history.pushState({}, "", NEXT_HOME_PATH);
    const root = await render(<NextApp />);
    expect(document.querySelector('[data-testid="home-recent-project"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="home-recent-project"]')?.textContent).toContain("最近使用業務");
    cleanup(root);
  });

  it("クイック解析はProject系統と独立している（Project一覧に影響しない）", async () => {
    const manager = getProjectManager();
    manager.createProject({
      name: "業務A",
      businessNumber: "A-1",
      designStage: "road-detailed",
    });
    window.history.pushState({}, "", "/app/quick");
    const root = await render(<NextApp />);
    expect(document.querySelector('[data-testid="quick-analysis-page"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="quick-analysis-placeholder"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="business-table"]')).toBeNull();
    cleanup(root);
  });

  it("navigateToでpushState遷移が動作する", async () => {
    window.history.pushState({}, "", NEXT_HOME_PATH);
    const root = await render(<NextApp />);
    act(() => {
      navigateTo(NEXT_BUSINESS_LIST_PATH);
    });
    expect(document.querySelector('[data-testid="business-list-page"]')).toBeTruthy();
    cleanup(root);
  });
});
