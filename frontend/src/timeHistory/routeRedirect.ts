export const legacyOutputTargetPath = "/th/output-targets";
export const legacyTimeHistoryRunPath = "/th/run";
export const legacyComparePath = "/compare";

export const proTimeHistoryRunPath = "/pro/th/run";
export const proComparePath = "/pro/compare";

export function resolveTimeHistoryPath(pathname: string): string {
  if (pathname === legacyOutputTargetPath) return proTimeHistoryRunPath;
  if (pathname === legacyTimeHistoryRunPath) return proTimeHistoryRunPath;
  if (pathname === legacyComparePath) return proComparePath;
  return pathname;
}

export function redirectLegacyRoutes(): boolean {
  if (typeof window === "undefined") return false;
  const nextPath = resolveTimeHistoryPath(window.location.pathname);
  if (nextPath === window.location.pathname) return false;
  window.history.replaceState(window.history.state, "", `${nextPath}${window.location.search}${window.location.hash}`);
  return true;
}
