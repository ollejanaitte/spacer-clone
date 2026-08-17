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
  it("HomePageは正規フロー1本（業務一覧へ）のみとし、レガシー第二入口を露出しない", async () => {
    const root = await render(<HomePage />);
    expect(document.querySelector('[data-testid="home-title"]')?.textContent).toContain("橋梁設計統合システム");
    expect(document.querySelector('[data-testid="home-business-entry"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="home-quick-entry"]')).toBeNull();
    expect(document.querySelector('[data-testid="home-go-business"]')?.textContent).toContain("業務一覧へ");
    expect(document.querySelector('[data-testid="home-go-quick"]')).toBeNull();
    expect(document.querySelector('[data-testid="home-dev-info"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="home-dev-info"]')?.textContent).toContain("production正");
    expect(document.querySelector('[data-testid="home-legacy-reference"]')).toBeNull();
    root.unmount();
  });
});
