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

function createDrawerHarness(
  initialProps: { open: boolean; onClose: () => void; title?: string },
): { rerender: (props: { open?: boolean; onClose?: () => void; title?: string; isDirty?: boolean }) => void } {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedRoots.push({ root, container });
  const render = (props: { open: boolean; onClose: () => void; title?: string; isDirty?: boolean }) => {
    act(() => {
      root.render(
        <GuidedDetailDrawer
          open={props.open}
          title={props.title ?? "テストタイトル"}
          isDirty={props.isDirty}
          onClose={props.onClose}
        >
          <input data-testid="drawer-input" />
        </GuidedDetailDrawer>,
      );
    });
  };
  render(initialProps);
  return {
    rerender: (props) => render({ open: props.open ?? false, onClose: props.onClose ?? (() => undefined), title: props.title, isDirty: props.isDirty }),
  };
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

  it("preserves focus when onClose identity changes while drawer stays open", () => {
    const harness = createDrawerHarness({ open: true, onClose: () => undefined });
    const input = document.querySelector('[data-testid="drawer-input"]') as HTMLInputElement;
    input.focus();
    expect(document.activeElement).toBe(input);

    // Parent re-render provides a NEW onClose function reference (the root cause).
    harness.rerender({ open: true, onClose: () => undefined });
    expect(document.activeElement).toBe(input);
  });

  it("preserves focus when isDirty/title update while drawer stays open", () => {
    const harness = createDrawerHarness({ open: true, onClose: () => undefined });
    const input = document.querySelector('[data-testid="drawer-input"]') as HTMLInputElement;
    input.focus();
    expect(document.activeElement).toBe(input);

    harness.rerender({ open: true, onClose: () => undefined, title: "新しいタイトル", isDirty: true });
    expect(document.activeElement).toBe(input);
  });

  it("preserves focus across repeated parent re-renders (Enter commit simulation)", () => {
    const harness = createDrawerHarness({ open: true, onClose: () => undefined });
    const input = document.querySelector('[data-testid="drawer-input"]') as HTMLInputElement;
    input.focus();
    expect(document.activeElement).toBe(input);

    // Simulate several parent re-renders (e.g. canonical commit on Enter).
    for (let i = 0; i < 5; i += 1) {
      harness.rerender({ open: true, onClose: () => undefined, isDirty: true });
      expect(document.activeElement).toBe(input);
    }
  });

  it("restores focus to trigger on actual close", () => {
    const trigger = document.createElement("button");
    trigger.setAttribute("data-testid", "trigger");
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    const harness = createDrawerHarness({ open: true, onClose: () => undefined });
    // Drawer autofocuses the first input; trigger is no longer focused.
    // (It may still be activeElement briefly in StrictMode, but the drawer
    // input is what matters for the close test.)
    const drawerInput = document.querySelector('[data-testid="drawer-input"]') as HTMLInputElement | null;
    if (drawerInput) drawerInput.focus();

    harness.rerender({ open: false, onClose: () => undefined });
    expect(document.activeElement).toBe(trigger);
  });

  it("does not throw when the recorded trigger is removed from the DOM on close", () => {
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();

    const harness = createDrawerHarness({ open: true, onClose: () => undefined });
    trigger.remove(); // trigger disappears while drawer open
    expect(() => harness.rerender({ open: false, onClose: () => undefined })).not.toThrow();
  });
});