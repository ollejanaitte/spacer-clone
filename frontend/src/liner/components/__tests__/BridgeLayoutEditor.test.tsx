// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { ja } from "../../../i18n/ja";
import { createDefaultLinerDraft } from "../../adapters/linerUiAdapter";
import { BridgeLayoutEditor } from "../BridgeLayoutEditor";

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

describe("BridgeLayoutEditor", () => {
  const draft = createDefaultLinerDraft();

  it("renders Japanese labels for pier and span editing", () => {
    render(
      <BridgeLayoutEditor
        draft={draft}
        piers={[
          {
            id: "P1",
            physicalDistance: 0,
            kind: "abutment",
          },
        ]}
        spans={[
          {
            id: "SP-1",
            startPhysicalDistance: 0,
            endPhysicalDistance: 100,
            pierIdStart: "P1",
          },
        ]}
        onPiersChange={() => undefined}
        onSpansChange={() => undefined}
      />,
    );

    expect(document.body.textContent).toContain(ja.liner.editor.bridgePierSection);
    expect(document.body.textContent).toContain(ja.liner.editor.bridgeSpanSection);
    expect(document.body.textContent).toContain(ja.liner.fields.pierStation);
    expect(document.body.textContent).toContain(ja.liner.fields.spanStartStation);
    expect(document.querySelector('[data-testid="bridge-pier-row-P1"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="bridge-span-row-SP-1"]')).not.toBeNull();
  });
});
