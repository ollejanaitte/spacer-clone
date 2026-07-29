// @vitest-environment jsdom
import { act } from "react";
import type { ComponentProps } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, test, vi } from "vitest";
import { ja } from "../i18n/ja";
import { Toolbar } from "./Toolbar";

function renderToolbar(overrides: Partial<ComponentProps<typeof Toolbar>> = {}) {
  const props: ComponentProps<typeof Toolbar> = {
    projectName: "Test Project",
    appVersion: "0.0.0",
    dirty: false,
    validationStatus: "Not validated",
    analysisStatus: "Not run",
    canRun: true,
    canExportResults: false,
    canExportCsv: false,
    canExportPdf: false,
    onBackToTop: vi.fn(),
    onNew: vi.fn(),
    onResetModel: vi.fn(),
    onOpen: vi.fn(),
    onSave: vi.fn(),
    onValidate: vi.fn(),
    onRun: vi.fn(),
    onRunEigen: vi.fn(),
    onRunInfluence: vi.fn(),
    onRunMovingLoad: vi.fn(),
    onRunResponseSpectrum: vi.fn(),
    onExportResultJson: vi.fn(),
    onExportResultCsv: vi.fn(),
    onExportResultPdf: vi.fn(),
    onOpenBridgeWizard: vi.fn(),
    ...overrides,
  };
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(<Toolbar {...props} />);
  });
  return { container, props };
}

describe("Toolbar", () => {
  test("shows top navigation and reset controls", () => {
    const { container } = renderToolbar();
    expect(container.textContent).toContain(ja.toolbar.backToTopButton);
    expect(container.textContent).toContain(ja.toolbar.resetButton);
  });

  test("calls top navigation and reset handlers", () => {
    const onBackToTop = vi.fn();
    const onResetModel = vi.fn();
    const { container } = renderToolbar({ onBackToTop, onResetModel });
    (container.querySelector('[data-testid="back-to-top"]') as HTMLButtonElement).click();
    (container.querySelector('[data-testid="reset-model"]') as HTMLButtonElement).click();
    expect(onBackToTop).toHaveBeenCalledTimes(1);
    expect(onResetModel).toHaveBeenCalledTimes(1);
  });

  test("shows Apollo entry as disabled when the shell is gated OFF", () => {
    const { container } = renderToolbar({
      apolloPhase1EntryTitle:
        "Apollo Phase 1-NN shell is installed but disabled until Apollo mode or VITE_APOLLO_PHASE1_NN_ENABLED=true is enabled.",
    });
    const button = container.querySelector('[data-testid="open-apollo-phase1"]') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-disabled")).toBe("true");
  });

  test("shows Apollo entry as enabled when the shell is available", () => {
    const onOpenApolloPhase1 = vi.fn();
    const { container } = renderToolbar({
      onOpenApolloPhase1,
      apolloPhase1EntryTitle: "Apollo Phase 1-NN shell",
    });
    const button = container.querySelector('[data-testid="open-apollo-phase1"]') as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    expect(button.getAttribute("aria-disabled")).toBe("false");
    button.click();
    expect(onOpenApolloPhase1).toHaveBeenCalledTimes(1);
  });
});
