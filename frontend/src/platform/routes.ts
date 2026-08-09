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
