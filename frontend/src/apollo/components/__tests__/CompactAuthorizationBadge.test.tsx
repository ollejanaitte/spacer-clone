// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { CompactAuthorizationBadge } from "../CompactAuthorizationBadge";

const mountedRoots: Array<{ root: ReturnType<typeof createRoot>; container: HTMLElement }> = [];

afterEach(() => {
  for (const entry of mountedRoots.splice(0)) {
    act(() => {
      entry.root.unmount();
    });
    entry.container.remove();
  }
});

function renderBadge(props?: {
  forceExpanded?: boolean;
}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedRoots.push({ root, container });
  act(() => {
    root.render(<CompactAuthorizationBadge forceExpanded={props?.forceExpanded} />);
  });
  return container;
}

describe("CompactAuthorizationBadge", () => {
  it("renders compact toggle by default", () => {
    const container = renderBadge();
    const toggle = container.querySelector('[data-testid="apollo-compact-auth-badge-toggle"]');
    expect(toggle).not.toBeNull();
    expect(toggle!.textContent).toMatch(/正式認可なし/);
  });

  it("shows authorization status text in compact button", () => {
    const container = renderBadge();
    const token = container.querySelector(".apollo-compact-auth-token");
    expect(token).not.toBeNull();
    expect(token!.textContent).toMatch(/正式認可なし|設計・施工/);
  });

  it("expands panel on click", () => {
    const container = renderBadge();
    const toggle = container.querySelector('[data-testid="apollo-compact-auth-badge-toggle"]') as HTMLButtonElement;
    expect(toggle).not.toBeNull();
    act(() => {
      toggle.click();
    });
    const panel = container.querySelector('[data-testid="apollo-compact-auth-badge-panel"]');
    expect(panel).not.toBeNull();
  });

  it("renders expanded view when forceExpanded is true", () => {
    const container = renderBadge({ forceExpanded: true });
    const l1 = container.querySelector('[data-testid="apollo-compact-auth-badge-l1"]');
    expect(l1).not.toBeNull();
    expect(l1!.textContent).toContain("開発確認用");
  });
});