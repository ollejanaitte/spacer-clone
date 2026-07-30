const APOLLO_PHASE1_ROUTE_PATH = "/pro/apollo";

function isApolloPathname(pathname: string): boolean {
  return pathname === APOLLO_PHASE1_ROUTE_PATH || pathname.startsWith(`${APOLLO_PHASE1_ROUTE_PATH}/`);
}

export function shouldPromptCloseGuardFromUrl(url: string): boolean {
  try {
    return isApolloPathname(new URL(url).pathname);
  } catch {
    return false;
  }
}
