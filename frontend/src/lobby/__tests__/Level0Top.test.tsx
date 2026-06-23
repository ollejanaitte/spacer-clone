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
  test("renders the title", () => {
    const { container } = renderComponent(<Level0Top onNavigate={() => {}} />);
    expect(container.textContent).toContain("入門編");
  });

  test("renders the description", () => {
    const { container } = renderComponent(<Level0Top onNavigate={() => {}} />);
    expect(container.textContent).toContain("用意されたサンプルを使って");
  });

  test("renders the sample cards", () => {
    const { container } = renderComponent(<Level0Top onNavigate={() => {}} />);
    expect(container.textContent).toContain("短い橋");
    expect(container.textContent).toContain("標準的な橋");
    expect(container.textContent).toContain("高い橋脚の橋");
  });

  test("renders the lesson mode card", () => {
    const { container } = renderComponent(<Level0Top onNavigate={() => {}} />);
    expect(container.textContent).toContain("教材モード");
  });

  test("navigates to /level0/lesson when the lesson mode is clicked", () => {
    const onNavigate = vi.fn();
    const { container } = renderComponent(<Level0Top onNavigate={onNavigate} />);
    const buttons = container.querySelectorAll("button") as NodeListOf<HTMLButtonElement>;
    const lessonButton = Array.from(buttons).find(b => b.textContent?.includes("教材モード"));
    lessonButton?.click();
    expect(onNavigate).toHaveBeenCalledWith("/level0/lesson");
  });

  test("renders the pro-mode link", () => {
    const { container } = renderComponent(<Level0Top onNavigate={() => {}} />);
    expect(container.textContent).toContain("実務編で詳しく見る");
  });

  test("navigates to /pro when the pro-mode link is clicked", () => {
    const onNavigate = vi.fn();
    const { container } = renderComponent(<Level0Top onNavigate={onNavigate} />);
    const buttons = container.querySelectorAll("button") as NodeListOf<HTMLButtonElement>;
    const proButton = Array.from(buttons).find(b => b.textContent?.includes("実務編で詳しく見る"));
    proButton?.click();
    expect(onNavigate).toHaveBeenCalledWith("/pro");
  });

  test("shows the parameter panel when a sample card is clicked", () => {
    const { container } = renderComponent(<Level0Top onNavigate={() => {}} />);
    const buttons = container.querySelectorAll("button");
    const sampleButton = Array.from(buttons).find(b => 
      b.textContent?.includes("短い橋") && !b.textContent?.includes("教材モード")
    );
    act(() => { sampleButton?.click(); });
    expect(container.textContent).toContain("条件を変えて試す");
  });

  test("shows the bridge-length slider in the parameter panel", () => {
    const { container } = renderComponent(<Level0Top onNavigate={() => {}} />);
    const buttons = container.querySelectorAll("button");
    const sampleButton = Array.from(buttons).find(b => 
      b.textContent?.includes("短い橋") && !b.textContent?.includes("教材モード")
    );
    act(() => { sampleButton?.click(); });
    expect(container.textContent).toContain("橋長:");
  });

  test("shows the pier-height slider in the parameter panel", () => {
    const { container } = renderComponent(<Level0Top onNavigate={() => {}} />);
    const buttons = container.querySelectorAll("button");
    const sampleButton = Array.from(buttons).find(b => 
      b.textContent?.includes("短い橋") && !b.textContent?.includes("教材モード")
    );
    act(() => { sampleButton?.click(); });
    expect(container.textContent).toContain("橋脚高さ:");
  });

  test("shows the pier-count selector in the parameter panel", () => {
    const { container } = renderComponent(<Level0Top onNavigate={() => {}} />);
    const buttons = container.querySelectorAll("button");
    const sampleButton = Array.from(buttons).find(b => 
      b.textContent?.includes("短い橋") && !b.textContent?.includes("教材モード")
    );
    act(() => { sampleButton?.click(); });
    expect(container.textContent).toContain("橋脚本数:");
  });

  test("shows the load-multiplier slider in the parameter panel", () => {
    const { container } = renderComponent(<Level0Top onNavigate={() => {}} />);
    const buttons = container.querySelectorAll("button");
    const sampleButton = Array.from(buttons).find(b => 
      b.textContent?.includes("短い橋") && !b.textContent?.includes("教材モード")
    );
    act(() => { sampleButton?.click(); });
    expect(container.textContent).toContain("荷重倍率:");
  });

  test("shows the reset-to-default button", () => {
    const { container } = renderComponent(<Level0Top onNavigate={() => {}} />);
    const buttons = container.querySelectorAll("button");
    const sampleButton = Array.from(buttons).find(b => 
      b.textContent?.includes("短い橋") && !b.textContent?.includes("教材モード")
    );
    act(() => { sampleButton?.click(); });
    expect(container.textContent).toContain("初期値に戻す");
  });

  test("shows the calculate button", () => {
    const { container } = renderComponent(<Level0Top onNavigate={() => {}} />);
    const buttons = container.querySelectorAll("button");
    const sampleButton = Array.from(buttons).find(b => 
      b.textContent?.includes("短い橋") && !b.textContent?.includes("教材モード")
    );
    act(() => { sampleButton?.click(); });
    expect(container.textContent).toContain("結果を計算");
  });

  test("shows the calculation result when the calculate button is clicked", () => {
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
