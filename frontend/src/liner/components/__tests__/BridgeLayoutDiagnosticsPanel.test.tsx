// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { ja } from "../../../i18n/ja";
import { createDefaultLinerDraft } from "../../adapters/linerUiAdapter";
import { BridgeLayoutDiagnosticsPanel } from "../BridgeLayoutDiagnosticsPanel";

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

describe("BridgeLayoutDiagnosticsPanel", () => {
  it("shows bridge layout diagnostics for invalid pier references", () => {
    const draft = {
      ...createDefaultLinerDraft(),
      spans: [
        {
          id: "SP-1",
          startPhysicalDistance: 0,
          endPhysicalDistance: 50,
          pierIdStart: "missing-pier",
        },
      ],
      piers: [],
    };

    render(<BridgeLayoutDiagnosticsPanel draft={draft} />);

    expect(document.querySelector('[data-testid="bridge-layout-diagnostics-panel"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="bridge-layout-diagnostics-error"]')).not.toBeNull();
    expect(document.body.textContent).toContain(ja.liner.errors.span_pier_reference_missing);
  });

  it("shows pipeline evaluation summary when layout is valid", () => {
    const draft = {
      ...createDefaultLinerDraft(),
      spans: [
        {
          id: "SP-1",
          startPhysicalDistance: 0,
          endPhysicalDistance: 100,
          pierIdStart: "P1",
          pierIdEnd: "P2",
        },
      ],
      piers: [
        { id: "P1", physicalDistance: 0, kind: "abutment" as const },
        { id: "P2", physicalDistance: 100, kind: "abutment" as const },
      ],
    };

    render(<BridgeLayoutDiagnosticsPanel draft={draft} />);

    expect(document.querySelector('[data-testid="bridge-layout-evaluation-summary"]')).not.toBeNull();
    expect(document.body.textContent).toContain("スパン 1 件");
    expect(document.body.textContent).toContain("支点 2 件");
  });
});
