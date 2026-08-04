// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { GuardDialogPortal } from "../GuardDialogPortal";

const mountedRoots: Array<{ root: ReturnType<typeof createRoot>; container: HTMLElement }> = [];

afterEach(() => {
  for (const entry of mountedRoots.splice(0)) {
    act(() => {
      entry.root.unmount();
    });
    entry.container.remove();
  }
  document.body.innerHTML = "";
});

function renderPortal(props: { open: boolean; testId?: string }) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedRoots.push({ root, container });
  act(() => {
    root.render(
      <GuardDialogPortal open={props.open} testId={props.testId}>
        <div data-testid="portal-content">content</div>
      </GuardDialogPortal>,
    );
  });
  return container;
}

describe("GuardDialogPortal", () => {
  it("renders nothing when closed", () => {
    renderPortal({ open: false, testId: "test-dialog" });
    expect(document.querySelector('[data-testid="test-dialog"]')).toBeNull();
  });

  it("renders portal at body level when open", () => {
    renderPortal({ open: true, testId: "test-dialog" });
    const portal = document.querySelector('[data-testid="test-dialog"]');
    expect(portal).not.toBeNull();
    expect(portal?.className).toContain("apollo-guard-backdrop");
    expect(portal?.querySelector('[data-testid="portal-content"]')).not.toBeNull();
  });

  it("locks body scroll when open", () => {
    renderPortal({ open: true });
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("restores scroll and removes portal on close", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    mountedRoots.push({ root, container });
    act(() => {
      root.render(<GuardDialogPortal open={true} testId="toggle-dialog"><span>child</span></GuardDialogPortal>);
    });
    expect(document.querySelector('[data-testid="toggle-dialog"]')).not.toBeNull();

    act(() => {
      root.render(<GuardDialogPortal open={false} testId="toggle-dialog"><span>child</span></GuardDialogPortal>);
    });
    expect(document.querySelector('[data-testid="toggle-dialog"]')).toBeNull();
    expect(document.body.style.overflow).toBe("");
  });
});