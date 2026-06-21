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

  test("サンプルカードをクリックするとパラメータパネルが表示される", () => {
    const { container } = renderComponent(<Level0Top onNavigate={() => {}} />);
    const buttons = container.querySelectorAll("button");
    const sampleButton = Array.from(buttons).find(b => 
      b.textContent?.includes("短い橋") && !b.textContent?.includes("教材モード")
    );
    act(() => { sampleButton?.click(); });
    expect(container.textContent).toContain("条件を変えて試す");
  });

  test("パラメータパネルに橋長スライダーがある", () => {
    const { container } = renderComponent(<Level0Top onNavigate={() => {}} />);
    const buttons = container.querySelectorAll("button");
    const sampleButton = Array.from(buttons).find(b => 
      b.textContent?.includes("短い橋") && !b.textContent?.includes("教材モード")
    );
    act(() => { sampleButton?.click(); });
    expect(container.textContent).toContain("橋長:");
  });

  test("パラメータパネルに橋脚高さスライダーがある", () => {
    const { container } = renderComponent(<Level0Top onNavigate={() => {}} />);
    const buttons = container.querySelectorAll("button");
    const sampleButton = Array.from(buttons).find(b => 
      b.textContent?.includes("短い橋") && !b.textContent?.includes("教材モード")
    );
    act(() => { sampleButton?.click(); });
    expect(container.textContent).toContain("橋脚高さ:");
  });

  test("パラメータパネルに橋脚本数セレクターがある", () => {
    const { container } = renderComponent(<Level0Top onNavigate={() => {}} />);
    const buttons = container.querySelectorAll("button");
    const sampleButton = Array.from(buttons).find(b => 
      b.textContent?.includes("短い橋") && !b.textContent?.includes("教材モード")
    );
    act(() => { sampleButton?.click(); });
    expect(container.textContent).toContain("橋脚本数:");
  });

  test("パラメータパネルに荷重倍率スライダーがある", () => {
    const { container } = renderComponent(<Level0Top onNavigate={() => {}} />);
    const buttons = container.querySelectorAll("button");
    const sampleButton = Array.from(buttons).find(b => 
      b.textContent?.includes("短い橋") && !b.textContent?.includes("教材モード")
    );
    act(() => { sampleButton?.click(); });
    expect(container.textContent).toContain("荷重倍率:");
  });

  test("初期値に戻すボタンがある", () => {
    const { container } = renderComponent(<Level0Top onNavigate={() => {}} />);
    const buttons = container.querySelectorAll("button");
    const sampleButton = Array.from(buttons).find(b => 
      b.textContent?.includes("短い橋") && !b.textContent?.includes("教材モード")
    );
    act(() => { sampleButton?.click(); });
    expect(container.textContent).toContain("初期値に戻す");
  });

  test("結果を計算ボタンがある", () => {
    const { container } = renderComponent(<Level0Top onNavigate={() => {}} />);
    const buttons = container.querySelectorAll("button");
    const sampleButton = Array.from(buttons).find(b => 
      b.textContent?.includes("短い橋") && !b.textContent?.includes("教材モード")
    );
    act(() => { sampleButton?.click(); });
    expect(container.textContent).toContain("結果を計算");
  });

  test("結果を計算ボタンをクリックすると計算結果が表示される", () => {
    const { container } = renderComponent(<Level0Top onNavigate={() => {}} />);
    const buttons = container.querySelectorAll("button");
    const sampleButton = Array.from(buttons).find(b => 
      b.textContent?.includes("短い橋") && !b.textContent?.includes("教材モード")
    );
    act(() => { sampleButton?.click(); });
    const calculateButton = Array.from(container.querySelectorAll("button"))
      .find(b => b.textContent?.includes("結果を計算"));
    act(() => { calculateButton?.click(); });
    expect(container.textContent).toContain("計算結果");
  });
});
