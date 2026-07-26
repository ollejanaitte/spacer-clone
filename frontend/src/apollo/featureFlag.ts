export const APOLLO_PHASE1_FLAG_NAME = "VITE_APOLLO_PHASE1_ENABLED";

export function parseApolloPhase1Flag(raw: string | undefined): boolean {
  return raw === "true";
}

export function isApolloPhase1Enabled(): boolean {
  const meta = import.meta as ImportMeta & { env?: Record<string, string | undefined> };
  return parseApolloPhase1Flag(meta.env?.[APOLLO_PHASE1_FLAG_NAME]);
}
