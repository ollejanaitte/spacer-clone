// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetProjectManagerForTest } from "../../project/projectManagerInstance";
import { HomePage } from "../HomePage";

async function render(node: ReactNode): Promise<Root> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(node);
  });
  return root;
}

beforeEach(() => {
  document.body.innerHTML = "";
  resetProjectManagerForTest();
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("P1-01 旧/新導線整理", () => {
  it("HomePageは正規フロー（業務一覧へ）とレガシーモード入口を表示する", async () => {
    const root = await render(<HomePage />);
    expect(document.querySelector('[data-testid="home-title"]')?.textContent).toContain("橋梁設計統合システム");
    expect(document.querySelector('[data-testid="home-business-entry"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="home-quick-entry"]')).toBeNull();
    expect(document.querySelector('[data-testid="home-go-business"]')?.textContent).toContain("業務一覧へ");
    expect(document.querySelector('[data-testid="home-go-quick"]')).toBeNull();
    expect(document.querySelector('[data-testid="home-dev-info"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="home-dev-info"]')?.textContent).toContain("production正");
    expect(document.querySelector('[data-testid="home-legacy-reference"]')).toBeNull();
    expect(document.querySelector('[data-testid="home-legacy-entry"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="home-legacy-entry"]')?.textContent).toContain("レガシーモード（クラシック画面）");
    expect(document.querySelector('[data-testid="home-go-legacy"]')?.textContent).toContain("レガシーモードを開く");
    root.unmount();
  });

  it("レガシーモードボタンで /pro へ遷移する", async () => {
    window.history.pushState({}, "", "/app");
    const root = await render(<HomePage />);
    const button = document.querySelector('[data-testid="home-go-legacy"]');
    if (!button) throw new Error("home-go-legacy button not found");
    await act(async () => {
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(window.location.pathname).toBe("/pro");
    root.unmount();
  });
});
