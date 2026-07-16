// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { ja } from "../../../i18n/ja";
import { createDefaultLinerDraft } from "../../adapters/linerUiAdapter";
import { WidthChangePointEditor } from "../WidthChangePointEditor";

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

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
  }
  host?.remove();
  root = null;
  host = null;
});

describe("WidthChangePointEditor", () => {
  const draft = createDefaultLinerDraft();

  it("renders Japanese labels for width change editing", () => {
    render(
      <WidthChangePointEditor
        draft={draft}
        widthChangePoints={[
          {
            id: "WP-1",
            physicalDistance: 0,
            leftOffset: 5,
            rightOffset: 5,
          },
        ]}
        onWidthChangePointsChange={() => undefined}
      />,
    );

    expect(document.body.textContent).toContain(ja.liner.editor.widthChangeSection);
    expect(document.body.textContent).toContain(ja.liner.fields.widthChangeStation);
    expect(document.body.textContent).toContain(ja.liner.fields.widthChangeLeftOffset);
    expect(document.body.textContent).toContain(ja.liner.fields.widthChangeRightOffset);
    expect(document.querySelector('[data-testid="width-change-point-row-WP-1"]')).not.toBeNull();
  });
});
