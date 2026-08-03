/**
 * Step 4-A workflow → work-surface navigation.
 * Maps workflow navigationTarget paths to the existing panel DOM selectors.
 * Workflow is the control plane; these panels are the work surfaces.
 */
import type { NavigationTarget } from "./types";

const PANEL_SELECTORS: Record<string, string> = {
  "wf-panel-bridge-structure": '[data-testid="apollo-bridge-structure-panel"]',
  "wf-panel-appurtenance": '[data-testid="apollo-appurtenance-panel"]',
  "wf-panel-haunch": '[data-testid="apollo-haunch-panel"]',
  "wf-panel-analysis": '[data-testid="apollo-analysis-development-probe"]',
  "wf-panel-demand": '[data-testid="apollo-demand-development-panel"]',
  "wf-panel-quantity": '[data-testid="apollo-quantity-model-panel"]',
  "wf-panel-load-confirmation": '[data-testid="apollo-load-confirmation-panel"]',
  "wf-panel-model-view": '[data-testid="apollo-model-view-panel"]',
  "wf-panel-report": '[data-testid="apollo-report-model-panel"]',
  "wf-panel-drawing": '[data-testid="apollo-drawing-model-panel"]',
  "wf-panel-output": '[data-testid="apollo-output-integration-panel"]',
  "wf-panel-ga": '[data-testid="apollo-general-arrangement-panel"]',
  /** Step 5 pavement panel (P3); falls back to bridge structure until panel ships. */
  "wf-panel-pavement": '[data-testid="apollo-pavement-panel"], [data-testid="apollo-bridge-structure-panel"]',
};

export function resolveNavigationTarget(target: NavigationTarget): { readonly ok: boolean; readonly reason: string } {
  if (target.kind === "route") {
    return { ok: true, reason: `route:${target.path}` };
  }
  const selector = PANEL_SELECTORS[target.path];
  if (!selector) {
    return { ok: false, reason: `unknown panel: ${target.path}` };
  }
  return { ok: true, reason: `panel:${target.path}` };
}

export function scrollWorkflowTargetIntoView(target: NavigationTarget): { readonly ok: boolean; readonly reason: string } {
  const resolved = resolveNavigationTarget(target);
  if (!resolved.ok) {
    return resolved;
  }
  if (target.kind === "route") {
    window.location.assign(target.path);
    return { ok: true, reason: `navigated to ${target.path}` };
  }
  const selector = PANEL_SELECTORS[target.path];
  const element = document.querySelector<HTMLElement>(selector ?? "");
  if (!element) {
    return { ok: false, reason: `panel not rendered: ${target.path}` };
  }
  element.scrollIntoView({ behavior: "smooth", block: "start" });
  return { ok: true, reason: `scrolled to ${target.path}` };
}
