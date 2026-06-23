// @vitest-environment jsdom
import { describe, test, expect, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { Level0Lesson } from "../pages/Level0Lesson";

function renderComponent(ui: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => { root.render(ui); });
  return { container, root };
}

describe("Level0Lesson", () => {
  test("タイトルが表示される", () => {
    const { container } = renderComponent(<Level0Lesson onNavigate={() => {}} />);
    expect(container.textContent).toContain("教材モード");
  });

  test("説明が表示される", () => {
    const { container } = renderComponent(<Level0Lesson onNavigate={() => {}} />);
    expect(container.textContent).toContain("橋の基本を、順番に確認していきます。");
  });

  test("教材カードが表示される", () => {
    const { container } = renderComponent(<Level0Lesson onNavigate={() => {}} />);
    expect(container.textContent).toContain("橋はなぜ支えられるのか");
    expect(container.textContent).toContain("橋脚が高いと何が変わるのか");
    expect(container.textContent).toContain("地震で橋はどう動くのか");
  });

  test("戻るボタンが表示される", () => {
    const { container } = renderComponent(<Level0Lesson onNavigate={() => {}} />);
    expect(container.textContent).toContain("入門編に戻る");
  });

  test("戻るボタンクリックで/level0に遷移", () => {
    const onNavigate = vi.fn();
    const { container } = renderComponent(<Level0Lesson onNavigate={onNavigate} />);
    const buttons = container.querySelectorAll("button") as NodeListOf<HTMLButtonElement>;
    const backButton = Array.from(buttons).find(b => b.textContent?.includes("入門編に戻る"));
    backButton?.click();
    expect(onNavigate).toHaveBeenCalledWith("/level0");
  });

  test("教材カードクリックで教材詳細へ遷移", () => {
    const onNavigate = vi.fn();
    const { container } = renderComponent(<Level0Lesson onNavigate={onNavigate} />);
    const lessonButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.includes("橋はなぜ支えられるのか"));
    lessonButton?.click();
    expect(onNavigate).toHaveBeenCalledWith("/level0/lesson/why-bridge-stands");
  });
});
