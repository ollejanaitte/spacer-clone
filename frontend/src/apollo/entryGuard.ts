import { isApolloPhase1Enabled } from "./featureFlag";
import { isApolloRoute } from "./routes";

export const APOLLO_DENIED_REDIRECT_PATH = "/pro";

export function shouldShowApolloPhase1Entry(): boolean {
  return isApolloPhase1Enabled();
}

export function resolveApolloEntryAccess(pathname: string): "shell" | "deny" | "none" {
  if (!isApolloRoute(pathname)) return "none";
  return isApolloPhase1Enabled() ? "shell" : "deny";
}

export function redirectDeniedApolloRoute(): boolean {
  if (typeof window === "undefined") return false;
  if (!isApolloRoute(window.location.pathname)) return false;
  if (isApolloPhase1Enabled()) return false;
  if (window.location.pathname === APOLLO_DENIED_REDIRECT_PATH) return false;
  window.history.replaceState(
    window.history.state,
    "",
    APOLLO_DENIED_REDIRECT_PATH,
  );
  return true;
}
