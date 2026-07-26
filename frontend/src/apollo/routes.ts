export const APOLLO_PHASE1_ROUTE_PATH = "/pro/apollo";

export function isApolloRoute(pathname: string): boolean {
  return pathname === APOLLO_PHASE1_ROUTE_PATH || pathname.startsWith(`${APOLLO_PHASE1_ROUTE_PATH}/`);
}
