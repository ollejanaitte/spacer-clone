// @vitest-environment jsdom
import { describe, test, expect, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { RestoreBanner } from "../components/RestoreBanner";
import { ProModeButton } from "../components/ProModeButton";
import { Level0ErrorCard } from "../components/Level0ErrorCard";
import { LegendOverlay } from "../components/LegendOverlay";

function renderComponent(ui: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  return { container, root };
}

describe("RestoreBanner", () => {
  test("復元メッセージが表示される", () => {
    const { container } = renderComponent(
      <RestoreBanner onRestore={() => {}} onDismiss={() => {}} />
    );
    expect(container.textContent).toContain("前回のつづきから始めますか？");
  });

  test("ボタンが表示される", () => {
    const { container } = renderComponent(
      <RestoreBanner onRestore={() => {}} onDismiss={() => {}} />
    );
    expect(container.textContent).toContain("つづきから");
    expect(container.textContent).toContain("最初から");
  });
});

describe("ProModeButton", () => {
  test("ボタンが表示される", () => {
    const { container } = renderComponent(
      <ProModeButton onClick={() => {}} />
    );
    expect(container.textContent).toContain("プロモードで開く");
  });
});

describe("Level0ErrorCard", () => {
  test("エラーコードが表示される", () => {
    const { container } = renderComponent(
      <Level0ErrorCard errorCode="TEST_ERROR" onRetry={() => {}} onHome={() => {}} />
    );
    expect(container.textContent).toContain("TEST_ERROR");
  });
});

describe("LegendOverlay", () => {
  test("凡例が表示される", () => {
    const { container } = renderComponent(<LegendOverlay />);
    expect(container.textContent).toContain("凡例");
    expect(container.textContent).toContain("青:ゆれ小");
  });
});
