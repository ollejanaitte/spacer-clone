// @vitest-environment jsdom
import { describe, test, expect, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { Home } from "../pages/Home";

function renderComponent(ui: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  return { container, root };
}

describe("Home", () => {
  test("タイトルが表示される", () => {
    const { container } = renderComponent(
      <Home onShake={() => {}} onOpenProMode={() => {}} />
    );
    expect(container.textContent).toContain("橋と建物の実験室");
  });

  test("メインカードが表示される", () => {
    const { container } = renderComponent(
      <Home onShake={() => {}} onOpenProMode={() => {}} />
    );
    expect(container.textContent).toContain("地震でゆらす");
  });

  test("非活性カードが表示される", () => {
    const { container } = renderComponent(
      <Home onShake={() => {}} onOpenProMode={() => {}} />
    );
    expect(container.textContent).toContain("橋をつくる（じゅんび中）");
    expect(container.textContent).toContain("建物をつくる（じゅんび中）");
    expect(container.textContent).toContain("サンプルを見る（じゅんび中）");
  });

  test("プロモードボタンが表示される", () => {
    const { container } = renderComponent(
      <Home onShake={() => {}} onOpenProMode={() => {}} />
    );
    expect(container.textContent).toContain("プロモードで開く");
  });

  test("メインカードクリックで onShake が呼ばれる", () => {
    const onShake = vi.fn();
    const { container } = renderComponent(
      <Home onShake={onShake} onOpenProMode={() => {}} />
    );
    const button = container.querySelector(".level0-card-main") as HTMLButtonElement;
    button.click();
    expect(onShake).toHaveBeenCalledTimes(1);
  });

  test("禁止用語が表示されない", () => {
    const { container } = renderComponent(
      <Home onShake={() => {}} onOpenProMode={() => {}} />
    );
    const FORBIDDEN = ["節点", "部材", "固有値", "時刻歴応答解析", "剛性", "応力", "支点条件"];
    for (const w of FORBIDDEN) {
      expect(container.textContent).not.toContain(w);
    }
  });
});
