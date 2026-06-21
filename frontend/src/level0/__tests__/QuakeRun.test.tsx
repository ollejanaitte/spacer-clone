// @vitest-environment jsdom
import { describe, test, expect, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { QuakeRun } from "../pages/QuakeRun";

function renderComponent(ui: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  return { container, root };
}

describe("QuakeRun", () => {
  test("カウントダウンが表示される", () => {
    const { container } = renderComponent(
      <QuakeRun onAnalysisComplete={() => {}} onAnalysisError={() => {}} />
    );
    expect(container.textContent).toContain("3...");
  });

  test("カウントダウンが減っていく", async () => {
    const { container } = renderComponent(
      <QuakeRun onAnalysisComplete={() => {}} onAnalysisError={() => {}} />
    );
    expect(container.textContent).toContain("3...");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1100));
    });
    expect(container.textContent).toContain("2...");
  });

  test("禁止用語が表示されない", () => {
    const { container } = renderComponent(
      <QuakeRun onAnalysisComplete={() => {}} onAnalysisError={() => {}} />
    );
    const FORBIDDEN = ["節点", "部材", "固有値", "時刻歴応答解析", "剛性", "応力", "支点条件"];
    for (const w of FORBIDDEN) {
      expect(container.textContent).not.toContain(w);
    }
  });
});
