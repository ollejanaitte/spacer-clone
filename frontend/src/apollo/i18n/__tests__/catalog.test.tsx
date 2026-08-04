// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ReactElement } from "react";
import {
  AUTHORIZATION_CATALOG,
  BUTTON_CATALOG,
  MEMBER_CATALOG,
  MISSING_LABEL_JA,
  STATUS_CATALOG,
  WORKFLOW_STEP_CATALOG,
  getAuthorizationMessage,
  getButtonLabel,
  getDiagnosticMessage,
  getFieldLabel,
  getMemberLabel,
  getStatusLabel,
  getStatusShortLabel,
  getWorkflowStepLabel,
  getWorkflowStepDescription,
} from "../index";
import { TechnicalDetails } from "../../components/TechnicalDetails";
import { AuthorizationBanner } from "../../components/AuthorizationBanner";
import { WORKFLOW_STEP_IDS, type WorkflowStatus } from "../../workflow/types";
import { STATUS_GROUP_LABELS } from "../../workflow/diagnostics";

const REQUIRED_STATUSES: WorkflowStatus[] = [
  "COMPLETE",
  "STALE",
  "BLOCKED",
  "NOT_STARTED",
  "AVAILABLE",
  "RECOMMENDED",
  "INCOMPLETE",
  "READY",
  "WARNING",
  "ERROR",
  "NOT_AUTHORIZED",
  "OUT_OF_SCOPE",
];

const REQUIRED_MEMBERS = [
  "MAIN_GIRDER",
  "CROSS_BEAM",
  "CROSS_FRAME",
  "UPPER_LATERAL_BRACING",
  "LOWER_LATERAL_BRACING",
  "RC_DECK",
  "HAUNCH",
  "CURB",
  "WALL_RAILING",
  "MEDIAN",
  "PAVEMENT",
  "ROAD_MARKING",
  "SUPPORT",
] as const;

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(ui: ReactElement): HTMLDivElement {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(ui);
  });
  return container;
}

afterEach(() => {
  if (root && container) {
    act(() => {
      root!.unmount();
    });
    container.remove();
  }
  root = null;
  container = null;
});

describe("apollo/i18n catalog coverage", () => {
  it("covers required workflow statuses with Japanese L1 (no raw English)", () => {
    for (const status of REQUIRED_STATUSES) {
      expect(STATUS_CATALOG[status]).toBeTruthy();
      const label = getStatusLabel(status);
      expect(label).not.toBe(MISSING_LABEL_JA);
      expect(label).not.toMatch(/^[A-Z_]+$/);
      expect(STATUS_GROUP_LABELS[status]).toBe(label);
    }
    expect(getStatusLabel("BLOCKED")).toBe("先に必要な作業があります");
    expect(getStatusLabel("STALE")).toBe("要再計算");
    expect(getStatusLabel("NOT_AUTHORIZED")).toBe("正式認可なし");
    expect(getStatusShortLabel("AVAILABLE")).toBe("操作可");
  });

  it("covers required members without confusing cross beam/frame", () => {
    for (const m of REQUIRED_MEMBERS) {
      expect(MEMBER_CATALOG[m]).toBeTruthy();
      expect(getMemberLabel(m)).not.toBe(MISSING_LABEL_JA);
    }
    expect(getMemberLabel("CROSS_BEAM")).toBe("横桁");
    expect(getMemberLabel("CROSS_FRAME")).toBe("対傾構");
    expect(getMemberLabel("SWAY_BRACING")).toBe("対傾構");
    expect(getMemberLabel("UPPER_LATERAL_BRACING")).toBe("上横構");
    expect(getMemberLabel("LOWER_LATERAL_BRACING")).toBe("下横構");
  });

  it("covers WF-01..WF-15", () => {
    for (const id of WORKFLOW_STEP_IDS) {
      expect(WORKFLOW_STEP_CATALOG[id]).toBeTruthy();
      expect(getWorkflowStepLabel(id)).not.toBe(MISSING_LABEL_JA);
      expect(getWorkflowStepDescription(id).length).toBeGreaterThan(0);
    }
  });

  it("covers buttons and authorization wording", () => {
    expect(getButtonLabel("APPLY_SAMPLE")).toBe("サンプルを適用");
    expect(getButtonLabel("SHOW_TECH")).toBe("技術情報を表示");
    expect(getButtonLabel("EXPORT_STL")).toBe("STLを出力");
    expect(Object.keys(BUTTON_CATALOG).length).toBeGreaterThan(5);

    expect(getAuthorizationMessage("NOT_GRANTED").l1).toBe("正式認可なし");
    expect(getAuthorizationMessage("PROHIBITED").l1).toBe("設計・施工への使用禁止");
    expect(getAuthorizationMessage("UNVERIFIED_DEVELOPMENT_ONLY").l1).toBe("開発確認用・未検証");
    expect(AUTHORIZATION_CATALOG.NOT_GRANTED.l3).toContain("NOT_GRANTED");
  });

  it("missing keys return Japanese placeholder and keep raw key in technical layer", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(getStatusLabel("NOT_A_REAL_STATUS")).toBe(MISSING_LABEL_JA);
    expect(getMemberLabel("NOT_A_MEMBER")).toBe(MISSING_LABEL_JA);
    expect(getButtonLabel("NOT_A_BUTTON")).toBe(MISSING_LABEL_JA);
    expect(getFieldLabel("notAField")).toBe(MISSING_LABEL_JA);
    const diag = getDiagnosticMessage("UNKNOWN_CODE_XYZ");
    expect(diag.l1).toBe(MISSING_LABEL_JA);
    expect(diag.technical?.code).toBe("UNKNOWN_CODE_XYZ");
    warn.mockRestore();
  });
});

describe("TechnicalDetails", () => {
  it("is collapsed by default and expands with aria-expanded", () => {
    const el = mount(
      <TechnicalDetails lines={["status=STALE", "diagnosticCode=WF_RESULT_OUTDATED"]} />,
    );
    const toggle = el.querySelector(
      '[data-testid="apollo-technical-details-toggle"]',
    ) as HTMLButtonElement;
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(el.querySelector('[data-testid="apollo-technical-details-panel"]')).toBeNull();
    act(() => {
      toggle.click();
    });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(el.querySelector('[data-testid="apollo-technical-details-panel"]')!.textContent).toContain(
      "status=STALE",
    );
  });
});

describe("AuthorizationBanner", () => {
  it("shows Japanese L1 first and keeps English tokens out of L1", () => {
    const el = mount(<AuthorizationBanner />);
    const l1 = el.querySelector('[data-testid="apollo-authorization-banner-l1"]')!;
    expect(l1.textContent).toContain("開発確認用・未検証");
    expect(l1.textContent).toContain("正式認可なし");
    expect(l1.textContent).toContain("設計・施工への使用禁止");
    expect(l1.textContent).not.toMatch(/NOT_GRANTED/);
    expect(el.querySelector('[data-testid="apollo-authorization-banner-tech-panel"]')).toBeNull();
  });
});
