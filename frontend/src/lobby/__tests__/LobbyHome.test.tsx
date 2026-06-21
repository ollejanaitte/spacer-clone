// @vitest-environment jsdom
import { describe, test, expect, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { LobbyHome } from "../pages/LobbyHome";

function renderComponent(ui: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => { root.render(ui); });
  return { container, root };
}

describe("LobbyHome", () => {
  test("タイトルが表示される", () => {
    const { container } = renderComponent(<LobbyHome onNavigate={() => {}} />);
    expect(container.textContent).toContain("橋と建物の実験室");
  });

  test("サブタイトルが表示される", () => {
    const { container } = renderComponent(<LobbyHome onNavigate={() => {}} />);
    expect(container.textContent).toContain("やりたいことを選んでください");
  });

  test("3カードが表示される", () => {
    const { container } = renderComponent(<LobbyHome onNavigate={() => {}} />);
    expect(container.textContent).toContain("学習編");
    expect(container.textContent).toContain("入門編");
    expect(container.textContent).toContain("実務編");
  });

  test("フッターが表示される", () => {
    const { container } = renderComponent(<LobbyHome onNavigate={() => {}} />);
    expect(container.textContent).toContain("いつでも他の編に切り替えできます");
  });

  test("学習編クリックで/learnに遷移", () => {
    const onNavigate = vi.fn();
    const { container } = renderComponent(<LobbyHome onNavigate={onNavigate} />);
    const buttons = container.querySelectorAll("button") as NodeListOf<HTMLButtonElement>;
    buttons[0].click();
    expect(onNavigate).toHaveBeenCalledWith("/learn");
  });

  test("入門編クリックで/level0に遷移", () => {
    const onNavigate = vi.fn();
    const { container } = renderComponent(<LobbyHome onNavigate={onNavigate} />);
    const buttons = container.querySelectorAll("button") as NodeListOf<HTMLButtonElement>;
    buttons[1].click();
    expect(onNavigate).toHaveBeenCalledWith("/level0");
  });

  test("実務編クリックで/proに遷移", () => {
    const onNavigate = vi.fn();
    const { container } = renderComponent(<LobbyHome onNavigate={onNavigate} />);
    const buttons = container.querySelectorAll("button") as NodeListOf<HTMLButtonElement>;
    buttons[2].click();
    expect(onNavigate).toHaveBeenCalledWith("/pro");
  });

  test("禁止用語が表示されない", () => {
    const { container } = renderComponent(<LobbyHome onNavigate={() => {}} />);
    const FORBIDDEN = ["節点", "部材", "固有値", "時刻歴応答解析", "剛性", "応力", "支点条件", "変位", "減衰", "骨組み計算", "FEM", "マトリクス"];
    for (const w of FORBIDDEN) {
      expect(container.textContent).not.toContain(w);
    }
  });
});
