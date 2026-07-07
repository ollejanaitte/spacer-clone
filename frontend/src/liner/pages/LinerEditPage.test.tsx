// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ja } from "../../i18n/ja";
import { LinerEditPage } from "./LinerEditPage";

vi.mock("recharts", () => ({
  CartesianGrid: () => <div data-testid="mock-cartesian-grid" />,
  Line: () => <div data-testid="mock-line" />,
  LineChart: ({ children }: { children: ReactNode }) => (
    <div data-testid="mock-line-chart">{children}</div>
  ),
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="mock-responsive-container">{children}</div>
  ),
  Tooltip: () => <div data-testid="mock-tooltip" />,
  XAxis: () => <div data-testid="mock-x-axis" />,
  YAxis: () => <div data-testid="mock-y-axis" />,
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let host: HTMLDivElement | null = null;

function render(node: ReactNode) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root?.render(node);
  });
}

function inputByTestId(testId: string): HTMLInputElement {
  return document.querySelector(`[data-testid=${testId}]`) as HTMLInputElement;
}

function setInputValue(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  valueSetter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
  }
  host?.remove();
  root = null;
  host = null;
});

describe("LinerEditPage", () => {
  it("renders the default local draft form", () => {
    render(<LinerEditPage onClose={() => undefined} onBackToList={() => undefined} />);

    expect(document.querySelector("[data-testid=liner-edit-page]")).not.toBeNull();
    expect(inputByTestId("liner-alignment-id").value).toBe("alignment-1");
    expect(inputByTestId("liner-element-length-S1").value).toBe("100");
  });

  it("updates a straight element and summary from form input", () => {
    render(<LinerEditPage onClose={() => undefined} onBackToList={() => undefined} />);

    act(() => {
      setInputValue(inputByTestId("liner-element-length-S1"), "125");
    });

    expect(inputByTestId("liner-element-length-S1").value).toBe("125");
    expect(document.querySelector("[data-testid=liner-summary-length]")?.textContent).toBe("125 m");
  });

  it("keeps temporary empty string identifiers local until a commit action", () => {
    const onDraftChange = vi.fn(() => {
      throw new Error("conversion failed");
    });
    render(
      <LinerEditPage
        onClose={() => undefined}
        onBackToList={() => undefined}
        onDraftChange={onDraftChange}
      />,
    );

    act(() => {
      setInputValue(inputByTestId("liner-alignment-id"), "");
    });

    expect(inputByTestId("liner-alignment-id").value).toBe("");
    expect(onDraftChange).not.toHaveBeenCalled();
    expect(document.querySelector("[data-testid=liner-edit-page]")).not.toBeNull();

    act(() => {
      setInputValue(inputByTestId("liner-alignment-id"), "XYZ");
    });
    expect(inputByTestId("liner-alignment-id").value).toBe("XYZ");
  });

  it("keeps horizontal numeric inputs empty while editing and accepts re-entry", () => {
    render(<LinerEditPage onClose={() => undefined} onBackToList={() => undefined} />);

    act(() => {
      setInputValue(inputByTestId("liner-element-length-S1"), "");
    });
    expect(inputByTestId("liner-element-length-S1").value).toBe("");

    act(() => {
      setInputValue(inputByTestId("liner-element-length-S1"), "150");
    });
    expect(inputByTestId("liner-element-length-S1").value).toBe("150");
    expect(document.querySelector("[data-testid=liner-summary-length]")?.textContent).toBe("150 m");
  });

  it("keeps station, vertical, and cross-section numeric inputs empty while editing", () => {
    render(<LinerEditPage onClose={() => undefined} onBackToList={() => undefined} />);

    act(() => {
      (document.querySelector("[data-testid=liner-setup-tab-station]") as HTMLButtonElement).click();
    });
    act(() => {
      setInputValue(inputByTestId("liner-station-interval"), "");
    });
    expect(inputByTestId("liner-station-interval").value).toBe("");
    act(() => {
      setInputValue(inputByTestId("liner-station-interval"), "25");
    });
    expect(inputByTestId("liner-station-interval").value).toBe("25");
    act(() => {
      setInputValue(inputByTestId("liner-display-sampling-interval"), "");
    });
    expect(inputByTestId("liner-display-sampling-interval").value).toBe("");
    act(() => {
      setInputValue(inputByTestId("liner-display-sampling-interval"), "5");
    });
    expect(inputByTestId("liner-display-sampling-interval").value).toBe("5");

    act(() => {
      (document.querySelector("[data-testid=liner-setup-tab-vertical]") as HTMLButtonElement).click();
    });
    act(() => {
      setInputValue(inputByTestId("liner-vertical-element-start-station-VG-default"), "");
    });
    expect(inputByTestId("liner-vertical-element-start-station-VG-default").value).toBe("");
    act(() => {
      setInputValue(inputByTestId("liner-vertical-element-start-station-VG-default"), "10");
    });
    expect(inputByTestId("liner-vertical-element-start-station-VG-default").value).toBe("10");

    act(() => {
      (document.querySelector("[data-testid=liner-setup-tab-crossSection]") as HTMLButtonElement).click();
    });
    act(() => {
      setInputValue(inputByTestId("cross-section-offset-line-offset-OL-0"), "");
    });
    expect(inputByTestId("cross-section-offset-line-offset-OL-0").value).toBe("");
    act(() => {
      setInputValue(inputByTestId("cross-section-offset-line-offset-OL-0"), "2.5");
    });
    expect(inputByTestId("cross-section-offset-line-offset-OL-0").value).toBe("2.5");
  });

  it("keeps focus while editing straight element identifiers", () => {
    render(<LinerEditPage onClose={() => undefined} onBackToList={() => undefined} />);
    const idInput = inputByTestId("liner-element-id-S1");

    act(() => {
      idInput.focus();
      setInputValue(idInput, "S1A");
    });

    expect(inputByTestId("liner-element-id-S1A").value).toBe("S1A");
    expect(document.activeElement).toBe(inputByTestId("liner-element-id-S1A"));
  });

  it("adds and removes straight element rows", () => {
    render(<LinerEditPage onClose={() => undefined} onBackToList={() => undefined} />);

    act(() => {
      (document.querySelector("[data-testid=add-liner-straight-element]") as HTMLButtonElement).click();
    });
    expect(inputByTestId("liner-element-length-S2").value).toBe("50");

    act(() => {
      (document.querySelector("[data-testid=remove-liner-element-S1]") as HTMLButtonElement).click();
    });
    expect(document.querySelector("[data-testid=liner-element-length-S1]")).toBeNull();
    expect(inputByTestId("liner-element-length-S2").value).toBe("50");
  });

  it("wires close and back navigation callbacks", () => {
    const onClose = vi.fn();
    const onBackToList = vi.fn();
    render(<LinerEditPage onClose={onClose} onBackToList={onBackToList} />);

    act(() => {
      (document.querySelector("[data-testid=close-liner-edit]") as HTMLButtonElement).click();
    });
    act(() => {
      (document.querySelector("[data-testid=back-to-liner-list]") as HTMLButtonElement).click();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onBackToList).toHaveBeenCalledTimes(1);
  });

  it("wires optional preview navigation", () => {
    const onOpenPreview = vi.fn();
    const onOpenMappingReview = vi.fn();
    render(
      <LinerEditPage
        onClose={() => undefined}
        onBackToList={() => undefined}
        onOpenPreview={onOpenPreview}
        onOpenMappingReview={onOpenMappingReview}
      />,
    );

    act(() => {
      (document.querySelector("[data-testid=open-liner-preview]") as HTMLButtonElement).click();
    });
    act(() => {
      (document.querySelector("[data-testid=open-liner-mapping-review]") as HTMLButtonElement).click();
    });

    expect(onOpenPreview).toHaveBeenCalledTimes(1);
    expect(onOpenMappingReview).toHaveBeenCalledTimes(1);
  });

  it("renders six setup tabs in JIP-LINER display order", () => {
    render(<LinerEditPage onClose={() => undefined} onBackToList={() => undefined} />);

    const tabButtons = Array.from(document.querySelectorAll("[data-testid^=liner-setup-tab-]")).filter(
      (element) => element.getAttribute("role") === "tab",
    );
    expect(tabButtons).toHaveLength(6);
    expect(tabButtons.map((button) => button.textContent)).toEqual([
      "ライン",
      "測点",
      "高さ",
      "縦断",
      "横断",
      "確認図",
    ]);
    expect(document.querySelector("[data-testid=liner-setup-tabpanel-line]")).not.toBeNull();
    expect(document.querySelector("[data-testid=liner-alignment-id]")).not.toBeNull();
  });

  it("switches tab panels when setup tabs are clicked", () => {
    render(<LinerEditPage onClose={() => undefined} onBackToList={() => undefined} />);

    act(() => {
      (document.querySelector("[data-testid=liner-setup-tab-station]") as HTMLButtonElement).click();
    });
    expect(document.querySelector("[data-testid=liner-setup-tabpanel-station]")).not.toBeNull();
    expect(document.querySelector("[data-testid=liner-origin-displayed-station]")).not.toBeNull();
    expect(document.querySelector("[data-testid=liner-alignment-id]")).toBeNull();

    act(() => {
      (document.querySelector("[data-testid=liner-setup-tab-height]") as HTMLButtonElement).click();
    });
    expect(document.querySelector("[data-testid=liner-setup-tabpanel-height]")).not.toBeNull();
    expect(document.querySelector("[data-testid=liner-origin-displayed-station]")).toBeNull();

    act(() => {
      (document.querySelector("[data-testid=liner-setup-tab-line]") as HTMLButtonElement).click();
    });
    expect(document.querySelector("[data-testid=liner-setup-tabpanel-line]")).not.toBeNull();
    expect(inputByTestId("liner-alignment-id").value).toBe("alignment-1");
  });

  it("renders vertical editor and profile chart on the vertical tab", () => {
    render(<LinerEditPage onClose={() => undefined} onBackToList={() => undefined} />);

    act(() => {
      (document.querySelector("[data-testid=liner-setup-tab-vertical]") as HTMLButtonElement).click();
    });

    expect(document.querySelector("[data-testid=liner-setup-tabpanel-vertical]")).not.toBeNull();
    expect(document.querySelector("[data-testid=add-liner-grade-element]")).not.toBeNull();
    expect(document.querySelector("[data-testid=add-liner-parabolic-element]")).not.toBeNull();
    expect(document.querySelector("[data-testid=vertical-profile-chart]")).not.toBeNull();
  });

  it("renders cross-section editor, superelevation editor, and preview on the cross-section tab", () => {
    render(<LinerEditPage onClose={() => undefined} onBackToList={() => undefined} />);

    act(() => {
      (document.querySelector("[data-testid=liner-setup-tab-crossSection]") as HTMLButtonElement).click();
    });

    expect(document.querySelector("[data-testid=liner-setup-tabpanel-crossSection]")).not.toBeNull();
    expect(document.querySelector("[data-testid=cross-section-template-id]")).not.toBeNull();
    expect(document.querySelector("[data-testid=superelevation-editor]")).not.toBeNull();
    expect(document.querySelector("[data-testid=cross-section-preview]")).not.toBeNull();
  });

  it("renders placeholders on height and review tabs", () => {
    render(<LinerEditPage onClose={() => undefined} onBackToList={() => undefined} />);

    act(() => {
      (document.querySelector("[data-testid=liner-setup-tab-height]") as HTMLButtonElement).click();
    });
    expect(document.querySelector("[data-testid=liner-setup-tab-placeholder-height]")).not.toBeNull();
    expect(document.body.textContent).toContain(ja.liner.setupTabPlaceholder.height.title);
    expect(document.querySelector("[data-testid=add-liner-grade-element]")).toBeNull();

    act(() => {
      (document.querySelector("[data-testid=liner-setup-tab-review]") as HTMLButtonElement).click();
    });
    expect(document.querySelector("[data-testid=liner-setup-tab-placeholder-review]")).not.toBeNull();
    expect(document.body.textContent).toContain(ja.liner.setupTabPlaceholder.review.title);
    expect(document.querySelector("[data-testid=cross-section-template-id]")).toBeNull();
  });
});
