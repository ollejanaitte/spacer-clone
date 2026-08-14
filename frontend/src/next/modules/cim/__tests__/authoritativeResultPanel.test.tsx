// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AuthoritativeResultPanel } from "../../../components/AuthoritativeResultPanel";
import { REAL_IF3_RESULT_RAW } from "../../analysis/__tests__/realIf3Fixture";

function makeIf3(status: string) {
  return { ...REAL_IF3_RESULT_RAW, status } as never;
}

/** Source document matching REAL_IF3_RESULT_RAW's binding fields. */
const MATCHING_SOURCE = {
  documentId: "11111111-1111-4111-8111-111111111111",
  revisionId: 1,
  modelChecksum: "a".repeat(64),
  nodeIds: ["0011bfd9-b117-503b-8c62-6e3a3a69086f", "22222222-2222-4222-8222-222222222222", "6a27c03d-ec97-5476-a605-f5b61b64809b"],
  memberIds: ["d059b760-59aa-5442-98f2-dc81d5bd486a"],
};

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
    const root = await render(<AuthoritativeResultPanel if3Result={makeIf3("SUCCEEDED")} sourceDocument={MATCHING_SOURCE} />);
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
    const root = await render(<AuthoritativeResultPanel if3Result={makeIf3("SUCCEEDED")} sourceDocument={MATCHING_SOURCE} />);
    expect(document.querySelector('[data-testid="if3-reaction-table"]')?.textContent).toContain("LC1");
    expect(document.querySelector('[data-testid="if3-reaction-table"]')?.textContent).toContain("6a27c03d");
    act(() => root.unmount());
  });

  it("does NOT treat a SUCCEEDED result as authoritative when source binding mismatches (Sol #2)", async () => {
    const root = await render(
      <AuthoritativeResultPanel
        if3Result={makeIf3("SUCCEEDED")}
        sourceDocument={{ documentId: "other-doc", revisionId: 99, modelChecksum: "x".repeat(64), nodeIds: [], memberIds: [] }}
      />,
    );
    expect(document.querySelector('[data-testid="if3-result-status"]')?.textContent).toContain("invalid");
    expect(document.querySelector('[data-testid="if3-reaction-table"]')).toBeNull();
    act(() => root.unmount());
  });
});
