// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import {
  addLinerOffset,
  createDefaultLinerDraft,
  updateLinerCrossSectionTemplate,
} from "../../adapters/linerUiAdapter";
import { HaunchDefinitionEditor } from "../HaunchDefinitionEditor";

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

describe("HaunchDefinitionEditor", () => {
  it("renders and adds a definition row", () => {
    let draft = addLinerOffset(createDefaultLinerDraft());
    draft = updateLinerCrossSectionTemplate(draft, {
      id: draft.crossSections?.[0]?.id ?? `CS-${draft.alignment.id}`,
      name: draft.crossSections?.[0]?.name ?? "Test",
      offsetLines: [
        { id: "OL-left", offset: -3, elevation: 0, role: "custom" },
        { id: "OL-right", offset: 3, elevation: 0, role: "custom" },
      ],
    });

    render(
      <HaunchDefinitionEditor
        draft={draft}
        onDraftChange={(update) => {
          draft = typeof update === "function" ? update(draft) : update;
          act(() => {
            root?.render(
              <HaunchDefinitionEditor
                draft={draft}
                onDraftChange={(nextUpdate) => {
                  draft = typeof nextUpdate === "function" ? nextUpdate(draft) : nextUpdate;
                }}
              />,
            );
          });
        }}
      />,
    );

    act(() => {
      (document.querySelector("[data-testid=haunch-definition-add]") as HTMLButtonElement).click();
    });

    expect(draft.haunchDefinitions).toHaveLength(1);
    expect(document.querySelector("[data-testid^=haunch-definition-row-]")).not.toBeNull();
    expect(document.querySelector("[data-testid^=haunch-anchors-]")).not.toBeNull();
  });
});
