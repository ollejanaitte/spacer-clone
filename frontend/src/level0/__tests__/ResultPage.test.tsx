// @vitest-environment jsdom
import { describe, test, expect, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { ResultPage } from "../pages/ResultPage";

function renderComponent(ui: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  return { container, root };
}

describe("ResultPage", () => {
  const mockProps = {
    maxDisplacement: { nodeId: "N007", valueCm: 12.5, timeSec: 15.3 },
    onRetry: () => {},
    onOther: () => {},
    onPro: () => {},
  };

  test("small: だいじょうぶそうが表示される", () => {
    const { container } = renderComponent(
      <ResultPage {...mockProps} judgement="small" />
    );
    expect(container.textContent).toContain("だいじょうぶそう");
  });

  test("medium: よく見てみようが表示される", () => {
    const { container } = renderComponent(
      <ResultPage {...mockProps} judgement="medium" />
    );
    expect(container.textContent).toContain("よく見てみよう");
  });

  test("large: 大きくゆれていますが表示される", () => {
    const { container } = renderComponent(
      <ResultPage {...mockProps} judgement="large" />
    );
    expect(container.textContent).toContain("大きくゆれています");
  });

  test("最大変位情報が表示される", () => {
    const { container } = renderComponent(
      <ResultPage {...mockProps} judgement="medium" />
    );
    expect(container.textContent).toContain("N007");
    expect(container.textContent).toContain("12.5");
  });

  test("アクションボタンが表示される", () => {
    const { container } = renderComponent(
      <ResultPage {...mockProps} judgement="medium" />
    );
    expect(container.textContent).toContain("もう一度ゆらす");
    expect(container.textContent).toContain("別の地震でためす");
    expect(container.textContent).toContain("プロモードで詳しく見る");
  });

  test("免責事項が表示される", () => {
    const { container } = renderComponent(
      <ResultPage {...mockProps} judgement="medium" />
    );
    expect(container.textContent).toContain("教育用の相対評価");
  });

  test("禁止用語が表示されない", () => {
    const { container } = renderComponent(
      <ResultPage {...mockProps} judgement="medium" />
    );
    const FORBIDDEN = ["節点", "部材", "固有値", "時刻歴応答解析", "剛性", "応力", "支点条件"];
    for (const w of FORBIDDEN) {
      expect(container.textContent).not.toContain(w);
    }
  });
});
