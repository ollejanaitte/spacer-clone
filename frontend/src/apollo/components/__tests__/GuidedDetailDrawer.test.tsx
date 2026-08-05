// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { ReactElement } from "react";
import { GuidedDetailDrawer } from "../GuidedDetailDrawer";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mountedRoots: Array<{ root: ReturnType<typeof createRoot>; container: HTMLElement }> = [];

afterEach(() => {
  for (const { root, container } of mountedRoots.splice(0)) {
    root.unmount();
    container.remove();
  }
  document.body.innerHTML = "";
});

function renderDrawer(
  props: Partial<{
    open: boolean;
    title: string;
    description: string;
    onClose: () => void;
  }> = {},
): { container: HTMLElement; onClose: () => void } {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const onClose = props.onClose ?? (() => undefined);
  mountedRoots.push({ root, container });
  act(() => {
    root.render(
      <GuidedDetailDrawer
        open={props.open ?? false}
        title={props.title ?? "テストタイトル"}
        description={props.description}
        onClose={onClose}
      >
        <input data-testid="drawer-input" />
      </GuidedDetailDrawer>,
    );
  });
  return { container, onClose };
}

function keyPress(key: string) {
  act(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });
}

describe("GuidedDetailDrawer", () => {
  it("renders nothing when closed", () => {
    renderDrawer({ open: false });
    expect(document.querySelector('[data-testid="apollo-guided-detail-drawer"]')).toBeNull();
  });

  it("renders drawer at body level when open", () => {
    renderDrawer({ open: true });
    const drawer = document.querySelector('[data-testid="apollo-guided-detail-drawer"]');
    expect(drawer).not.toBeNull();
    expect(document.querySelector('[data-testid="apollo-guided-detail-drawer-title"]')?.textContent).toBe("テストタイトル");
    expect(document.querySelector('[data-testid="drawer-input"]')).not.toBeNull();
  });

  it("closes on Escape key", () => {
    let closed = 0;
    renderDrawer({ open: true, onClose: () => { closed += 1; } });
    keyPress("Escape");
    expect(closed).toBe(1);
  });

  it("closes on close button click", () => {
    let closed = 0;
    renderDrawer({ open: true, onClose: () => { closed += 1; } });
    act(() => {
      (document.querySelector('[data-testid="apollo-guided-detail-drawer-close"]') as HTMLButtonElement).click();
    });
    expect(closed).toBe(1);
  });

  it("closes on done button click", () => {
    let closed = 0;
    renderDrawer({ open: true, onClose: () => { closed += 1; } });
    act(() => {
      (document.querySelector('[data-testid="apollo-guided-detail-drawer-done"]') as HTMLButtonElement).click();
    });
    expect(closed).toBe(1);
  });

  it("locks body scroll when open", () => {
    renderDrawer({ open: true });
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("restores scroll and removes portal on close", () => {
    const { container } = renderDrawer({ open: true });
    const root = mountedRoots.find((entry) => entry.container === container)?.root;
    expect(root).toBeDefined();
    act(() => {
      root!.render(
        <GuidedDetailDrawer open={false} title="テスト" onClose={() => undefined}>
          <input />
        </GuidedDetailDrawer>,
      );
    });
    expect(document.querySelector('[data-testid="apollo-guided-detail-drawer"]')).toBeNull();
    expect(document.body.style.overflow).toBe("");
  });

  it("uses role dialog with aria-modal", () => {
    renderDrawer({ open: true });
    const section = document.querySelector('[role="dialog"]');
    expect(section).not.toBeNull();
    expect(section?.getAttribute("aria-modal")).toBe("true");
    expect(section?.getAttribute("aria-labelledby")).toBeTruthy();
  });
});