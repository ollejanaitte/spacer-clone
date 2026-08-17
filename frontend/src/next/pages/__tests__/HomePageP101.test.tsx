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
  it("HomePageはPDF準拠の2系統表示とし、開発者向け情報を折りたたみに退避する", async () => {
    const root = await render(<HomePage />);
    expect(document.querySelector('[data-testid="home-title"]')?.textContent).toContain("橋梁設計統合システム");
    expect(document.querySelector('[data-testid="home-business-entry"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="home-quick-entry"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="home-go-business"]')?.textContent).toContain("業務一覧へ");
    expect(document.querySelector('[data-testid="home-go-quick"]')?.textContent).toContain("レガシーモード");
    expect(document.querySelector('[data-testid="home-dev-info"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="home-dev-info"]')?.textContent).toContain("production正");
    expect(document.querySelector('[data-testid="home-legacy-reference"]')?.textContent).toContain("legacy /pro");
    expect(document.querySelector('[data-testid="home-dev-info"]')?.textContent).toContain("参照");
    root.unmount();
  });
});
