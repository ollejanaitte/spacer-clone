// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AuthoritativeResultPanel } from "../../../components/AuthoritativeResultPanel";
import { REAL_IF3_RESULT_RAW } from "../../analysis/__tests__/realIf3Fixture";

function makeIf3(status: string) {
  return { ...REAL_IF3_RESULT_RAW, status } as never;
}

async function render(node: ReactNode): Promise<Root> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(node);
  });
  return root;
}

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("AuthoritativeResultPanel (Phase 9-04R3 I-06/07/08)", () => {
  it("renders empty state when no IF3 result", async () => {
    const root = await render(<AuthoritativeResultPanel if3Result={null} />);
    expect(document.querySelector('[data-testid="if3-result-empty"]')).toBeTruthy();
    act(() => root.unmount());
  });

  it("does NOT render authoritative tables for non-authoritative status", async () => {
    const root = await render(<AuthoritativeResultPanel if3Result={makeIf3("FAILED")} />);
    expect(document.querySelector('[data-testid="if3-result-status"]')?.textContent).toContain("invalid");
    expect(document.querySelector('[data-testid="if3-reaction-table"]')).toBeNull();
    act(() => root.unmount());
  });

  it("renders authoritative Reaction / NQM / Deformed tables from the IF3 result", async () => {
    const root = await render(<AuthoritativeResultPanel if3Result={makeIf3("SUCCEEDED")} />);
    expect(document.querySelector('[data-testid="if3-result-status"]')?.textContent).toContain("authoritative");
    const reactionRows = document.querySelectorAll('[data-testid="if3-reaction-row"]');
    expect(reactionRows.length).toBe(1);
    expect(reactionRows[0]?.textContent).toContain("125");
    const memberRows = document.querySelectorAll('[data-testid="if3-memberforce-row"]');
    expect(memberRows.length).toBe(1);
    expect(memberRows[0]?.textContent).toContain("-125");
    expect(document.querySelector('[data-testid="if3-deformed-summary"]')?.textContent).toContain("0.5000");
    act(() => root.unmount());
  });

  it("shows entityId + resolved load case label in the tables (traceability)", async () => {
    const root = await render(<AuthoritativeResultPanel if3Result={makeIf3("SUCCEEDED")} />);
    expect(document.querySelector('[data-testid="if3-reaction-table"]')?.textContent).toContain("LC1");
    expect(document.querySelector('[data-testid="if3-reaction-table"]')?.textContent).toContain("6a27c03d");
    act(() => root.unmount());
  });
});
