/**
 * Navigation / layout / help utilities (STEP-3 S3-UX08).
 *
 * Shared helpers for the global UI:
 * - layout mode (wide / medium / narrow) from viewport width (UX-P07 §4)
 * - tab badge counts (errors per tab -> red badge, UX-P07 §8)
 * - inline help entry model (every field can carry a short explanation +
 *   optional beginner wording, UX-P07 §6)
 *
 * Pure functions so the behaviour is unit-testable without a DOM.
 */

export type LayoutMode = "wide" | "medium" | "narrow";

export const LAYOUT_BREAKPOINTS = { narrow: 768, medium: 1024 } as const;

export function layoutMode(width: number): LayoutMode {
  if (width < LAYOUT_BREAKPOINTS.narrow) return "narrow";
  if (width < LAYOUT_BREAKPOINTS.medium) return "medium";
  return "wide";
}

export interface HelpEntry {
  /** i18n key for the field label. */
  labelKey: string;
  /** short designer-level description. */
  description: string;
  /** optional beginner-friendly explanation. */
  beginner?: string;
}

export interface TabDiagnosticCounts {
  errors: number;
  warnings: number;
}

/** Aggregate per-tab diagnostic counts from payloads keyed by tab id. */
export function aggregateTabDiagnostics(
  perTab: Record<string, TabDiagnosticCounts>,
): Record<string, TabDiagnosticCounts> {
  const out: Record<string, TabDiagnosticCounts> = {};
  for (const [tab, counts] of Object.entries(perTab)) {
    out[tab] = {
      errors: Math.max(0, counts.errors),
      warnings: Math.max(0, counts.warnings),
    };
  }
  return out;
}

/** Total errors across all tabs (drives the global error badge). */
export function totalErrors(perTab: Record<string, TabDiagnosticCounts>): number {
  return Object.values(perTab).reduce((sum, c) => sum + c.errors, 0);
}

/** Total warnings across all tabs. */
export function totalWarnings(perTab: Record<string, TabDiagnosticCounts>): number {
  return Object.values(perTab).reduce((sum, c) => sum + c.warnings, 0);
}
