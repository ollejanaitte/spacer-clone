/**
 * Lane U canonical workflow route constants.
 *
 * These mirror the existing canonical entry routes so the workflow layer
 * stays decoupled from each subsystem's route module. When a subsystem
 * changes its route, update the mirror here (single workflow contract).
 *
 * Existing owners:
 * - Design Platform: frontend/src/platform/routes.ts (DESIGN_PLATFORM_HOME_PATH)
 * - LINER launcher:  frontend/src/liner/uiPreparation.ts (LINEAR_COORDINATE_LAUNCHER_PATH)
 * - Apollo phase 1:  frontend/src/apollo/routes.ts (APOLLO_PHASE1_ROUTE_PATH)
 * - Substructure:    frontend/src/liner/uiPreparation.ts (SUBSTRUCTURE_ROUTE_PATH)
 * - Main3D:          frontend/src/liner/uiPreparation.ts (LINER_UI_ROUTE_PATHS["liner.main3d"])
 * - App Shell (FEM): frontend/src/App.tsx (`/pro`)
 */

/** Canonical entry to project selection / creation (Design Platform Home). */
export const PROJECT_SELECTION_PATH = "/pro/platform";

/** App Shell / FEM / Analysis / 3D workspace. */
export const APP_SHELL_PATH = "/pro";

/** Road design entry (LINER launcher). */
export const ROAD_DESIGN_PATH = "/pro/linear-coordinate";

/** Superstructure design entry (Apollo phase 1 shell). */
export const SUPERSTRUCTURE_DESIGN_PATH = "/pro/apollo";

/** Substructure design entry. */
export const SUBSTRUCTURE_DESIGN_PATH = "/pro/liner/substructure";

/** Unified 3D entry (existing Main3D). */
export const MAIN3D_PATH = "/pro/liner/main3d";

/** Lane U Wave 1: Site Context (site conditions / geographic info) entry page. */
export const SITE_CONTEXT_ROUTE_PATH = "/pro/site-context";

export function isSiteContextRoute(pathname: string): boolean {
  return pathname === SITE_CONTEXT_ROUTE_PATH;
}