import type { LinerDrawingWorkspaceKind } from "../../uiPreparation";
import type { DrawingSheetPageKind } from "../model/document";

export type FormalDrawingPageDescriptor = {
  kind: DrawingSheetPageKind;
  sheetId: string;
  routeKind: LinerDrawingWorkspaceKind;
};

export const FORMAL_DRAWING_PAGES: readonly FormalDrawingPageDescriptor[] = [
  { kind: "plan", sheetId: "plan-sheet", routeKind: "plan" },
  { kind: "profile", sheetId: "profile-sheet", routeKind: "profile" },
  { kind: "cross_section", sheetId: "cross_section-sheet", routeKind: "cross-section" },
] as const;

export function formalDrawingPageCount(): number {
  return FORMAL_DRAWING_PAGES.length;
}

export function resolveFormalDrawingPageByRoute(
  routeKind: LinerDrawingWorkspaceKind,
): FormalDrawingPageDescriptor {
  const page = FORMAL_DRAWING_PAGES.find((entry) => entry.routeKind === routeKind);
  if (!page) {
    return FORMAL_DRAWING_PAGES[0]!;
  }
  return page;
}

export function resolveFormalDrawingPageBySheetId(sheetId: string): FormalDrawingPageDescriptor | undefined {
  return FORMAL_DRAWING_PAGES.find((entry) => entry.sheetId === sheetId);
}
