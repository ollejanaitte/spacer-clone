// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  computeGradeEndElevation,
  VerticalElementEditor,
} from "../VerticalElementEditor";
import type { VerticalAlignmentDraft, VerticalGradeElementDraft } from "../../schema/types";

vi.mock("lucide-react", () => ({
  FilePlus2: () => null,
  Trash2: () => null,
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
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
  }
  host?.remove();
  root = null;
  host = null;
});

describe("VerticalElementEditor UI (PR-B)", () => {
  const baseGradeElement: VerticalGradeElementDraft = {
    type: "grade",
    id: "VG-1",
    startStation: 0,
    endStation: 100,
    startElevation: 20,
    grade: 0.2,
    length: 100,
  };

  const verticalAlignment: VerticalAlignmentDraft = {
    id: "VA-test",
    elements: [baseGradeElement],
  };

  it("displays grade as percent and computes end elevation (case 1)", () => {
    expect(computeGradeEndElevation(baseGradeElement)).toBeCloseTo(40, 9);

    render(
      <VerticalElementEditor
        verticalAlignment={verticalAlignment}
        onVerticalAlignmentChange={() => undefined}
      />,
    );

    expect(inputByTestId("liner-vertical-element-grade-VG-1").value).toBe("20");
    expect(inputByTestId("liner-vertical-element-length-VG-1").readOnly).toBe(true);
    expect(inputByTestId("liner-vertical-element-length-VG-1").value).toBe("100");
  });

  it("auto-updates length when end station changes", () => {
    let nextAlignment = verticalAlignment;
    const Harness = () => (
      <VerticalElementEditor
        verticalAlignment={nextAlignment}
        onVerticalAlignmentChange={(value) => {
          nextAlignment = value;
        }}
      />
    );

    render(<Harness />);

    act(() => {
      setInputValue(inputByTestId("liner-vertical-element-end-station-VG-1"), "80");
    });

    act(() => {
      root?.render(<Harness />);
    });

    expect(nextAlignment.elements[0]?.length).toBe(80);
    expect(inputByTestId("liner-vertical-element-length-VG-1").value).toBe("80");
  });

  it("sets next element start station from previous end station", () => {
    let nextAlignment = verticalAlignment;
    render(
      <VerticalElementEditor
        verticalAlignment={verticalAlignment}
        onVerticalAlignmentChange={(value) => {
          nextAlignment = value;
        }}
      />,
    );

    act(() => {
      (document.querySelector("[data-testid=add-liner-grade-element]") as HTMLButtonElement).click();
    });

    const second = nextAlignment.elements[1];
    expect(second?.startStation).toBe(100);
    expect(second?.endStation).toBe(150);
  });

  it("accepts grade percent with up to 3 decimal places", () => {
    let nextAlignment = verticalAlignment;
    render(
      <VerticalElementEditor
        verticalAlignment={verticalAlignment}
        onVerticalAlignmentChange={(value) => {
          nextAlignment = value;
        }}
      />,
    );

    act(() => {
      setInputValue(inputByTestId("liner-vertical-element-grade-VG-1"), "12.345");
    });

    const gradeElement = nextAlignment.elements[0];
    expect(gradeElement?.type).toBe("grade");
    if (gradeElement?.type === "grade") {
      expect(gradeElement.grade).toBeCloseTo(0.12345, 9);
    }
  });
});
