// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { NextApp } from "../NextApp";
import { isNextAppPath, NEXT_BUSINESS_LIST_PATH, NEXT_PROJECT_HOME_PATH } from "../routes";

function render(node: ReactNode): Root {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
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
});

describe("next/routes", () => {
  it("isNextAppPath は /app 配下を判定する", () => {
    expect(isNextAppPath("/app")).toBe(true);
    expect(isNextAppPath("/app/business")).toBe(true);
    expect(isNextAppPath("/pro")).toBe(false);
    expect(isNextAppPath("/")).toBe(false);
  });
});

describe("NextApp Shell", () => {
  it("業務一覧（空状態）を表示する", () => {
    window.history.pushState({}, "", NEXT_BUSINESS_LIST_PATH);
    const root = render(<NextApp />);
    expect(document.querySelector('[data-testid="next-app"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="next-brand"]')?.textContent).toContain("Project System");
    expect(document.querySelector('[data-testid="business-list-empty"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="new-project-button"]')).toBeTruthy();
    cleanup(root);
  });

  it("Project Home で未実装セクションを明示する", () => {
    window.history.pushState({}, "", `${NEXT_PROJECT_HOME_PATH}/proj-001`);
    const root = render(<NextApp />);
    expect(document.querySelector('[data-testid="project-home-page"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="project-home-id"]')?.textContent).toContain("proj-001");
    expect(document.querySelector('[data-testid="section-road-todo"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="section-analysis-todo"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="section-cim-todo"]')).toBeTruthy();
    cleanup(root);
  });
});
