export const DESIGN_PLATFORM_HOME_PATH = "/pro/platform";
export const DESIGN_PLATFORM_BUSINESS_LIST_PATH = "/pro/platform/businesses";

export function isDesignPlatformRoute(pathname: string): boolean {
  return pathname === DESIGN_PLATFORM_HOME_PATH || pathname.startsWith("/pro/platform/");
}

export function isDesignPlatformHome(pathname: string): boolean {
  return pathname === DESIGN_PLATFORM_HOME_PATH;
}

export function isBusinessListPath(pathname: string): boolean {
  return pathname === DESIGN_PLATFORM_BUSINESS_LIST_PATH;
}

export function isBusinessWorkspacePath(pathname: string): boolean {
  return /^\/pro\/platform\/businesses\/[^/]+\/?$/.test(pathname);
}

export function resolveBusinessWorkspacePath(businessId: string): string {
  return `/pro/platform/businesses/${businessId}`;
}

export function parseBusinessWorkspacePath(pathname: string): { businessId: string } | null {
  const match = /^\/pro\/platform\/businesses\/([^/]+)\/?$/.exec(pathname);
  if (match === null) {
    return null;
  }
  return { businessId: decodeURIComponent(match[1]!) };
}
