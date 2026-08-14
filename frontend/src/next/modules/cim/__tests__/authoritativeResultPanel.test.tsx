// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AuthoritativeResultPanel } from "../../../components/AuthoritativeResultPanel";

function makeIf3(status: string) {
  return {
    schemaId: "frame-analysis-result/1",
    schemaVersion: "1.0.0",
    resultId: "RES-1",
    analysisRunId: "RUN-1",
    sourceDocumentId: "DOC-1",
    sourceDocumentVersion: "REV-1",
    status,
    generatedAt: new Date().toISOString(),
    solverName: "scipy_sparse",
    solverVersion: "0.3.0",
    resultKinds: ["nodeDisplacement", "supportReaction", "memberForce"],
    sourceContentChecksum: { algorithm: "sha256", hexDigest: "abc123" },
    payload: {
      nodeDisplacement: {
        schemaVersion: "0.1.0",
        rows: [
          { loadCaseId: "LC1", entityId: "n1", values: { ux: 0, uy: 0, uz: 0, rx: 0, ry: 0, rz: 0 } },
          { loadCaseId: "LC1", entityId: "n2", values: { ux: 0, uy: 0, uz: -0.5, rx: 0, ry: 0, rz: 0 } },
        ],
      },
      supportReaction: {
        schemaVersion: "0.1.0",
        rows: [
          { loadCaseId: "LC1", nodeId: "n1", supportId: "A1", values: { fx: 0, fy: 0, fz: 125, mx: 0, my: 0, mz: 0 } },
        ],
      },
      memberForce: {
        schemaVersion: "0.1.0",
        rows: [
          { loadCaseId: "LC1", entityId: "m1", values: { i: { fx: -125, fy: 0, fz: 0, mx: 0, my: 0, mz: 0 }, j: { fx: 125, fy: 0, fz: 0, mx: 0, my: 0, mz: 0 } } },
        ],
      },
    },
  };
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
    const root = await render(<AuthoritativeResultPanel if3Result={makeIf3("FAILED") as never} />);
    expect(document.querySelector('[data-testid="if3-result-status"]')?.textContent).toContain("invalid");
    expect(document.querySelector('[data-testid="if3-reaction-table"]')).toBeNull();
    act(() => root.unmount());
  });

  it("renders authoritative Reaction / NQM / Deformed tables from the IF3 result", async () => {
    const root = await render(<AuthoritativeResultPanel if3Result={makeIf3("SUCCEEDED") as never} />);
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
});
