// @vitest-environment jsdom
import { describe, test, expect, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { Level0Top } from "../pages/Level0Top";

function renderComponent(ui: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => { root.render(ui); });
  return { container, root };
}

describe("Level0Top", () => {
  test("タイトルが表示される", () => {
    const { container } = renderComponent(<Level0Top onNavigate={() => {}} />);
    expect(container.textContent).toContain("入門編");
  });

  test("説明が表示される", () => {
    const { container } = renderComponent(<Level0Top onNavigate={() => {}} />);
    expect(container.textContent).toContain("用意されたサンプルを使って");
  });

  test("サンプルカードが表示される", () => {
    const { container } = renderComponent(<Level0Top onNavigate={() => {}} />);
    expect(container.textContent).toContain("短い橋");
    expect(container.textContent).toContain("標準的な橋");
    expect(container.textContent).toContain("高い橋脚の橋");
  });

  test("教材モードカードが表示される", () => {
    const { container } = renderComponent(<Level0Top onNavigate={() => {}} />);
    expect(container.textContent).toContain("教材モード");
  });

  test("教材モードクリックで/level0/lessonに遷移", () => {
    const onNavigate = vi.fn();
    const { container } = renderComponent(<Level0Top onNavigate={onNavigate} />);
    const buttons = container.querySelectorAll("button") as NodeListOf<HTMLButtonElement>;
    const lessonButton = Array.from(buttons).find(b => b.textContent?.includes("教材モード"));
    lessonButton?.click();
    expect(onNavigate).toHaveBeenCalledWith("/level0/lesson");
  });

  test("実務編リンクが表示される", () => {
    const { container } = renderComponent(<Level0Top onNavigate={() => {}} />);
    expect(container.textContent).toContain("実務編で詳しく見る");
  });

  test("実務編リンククリックで/proに遷移", () => {
    const onNavigate = vi.fn();
    const { container } = renderComponent(<Level0Top onNavigate={onNavigate} />);
    const buttons = container.querySelectorAll("button") as NodeListOf<HTMLButtonElement>;
    const proButton = Array.from(buttons).find(b => b.textContent?.includes("実務編で詳しく見る"));
    proButton?.click();
    expect(onNavigate).toHaveBeenCalledWith("/pro");
  });
});
