export const APOLLO_PHASE1_FLAG_NAME = "VITE_APOLLO_PHASE1_ENABLED";
export const APOLLO_PHASE1_NN_ENABLED_FLAG_NAME = "VITE_APOLLO_PHASE1_NN_ENABLED";
export const APOLLO_PHASE1_NUMERIC_RELEASE_BLOCKED_FLAG_NAME =
  "VITE_APOLLO_PHASE1_NUMERIC_RELEASE_BLOCKED";
export const APOLLO_PHASE1_SHOW_PROVISIONAL_STATUS_FLAG_NAME =
  "VITE_APOLLO_PHASE1_SHOW_PROVISIONAL_STATUS";
export const APOLLO_PHASE1_DISABLE_RESULT_PUBLICATION_FLAG_NAME =
  "VITE_APOLLO_PHASE1_DISABLE_RESULT_PUBLICATION";
export const APOLLO_PHASE1_DISABLE_NUMERIC_EXECUTION_FLAG_NAME =
  "VITE_APOLLO_PHASE1_DISABLE_NUMERIC_EXECUTION";

export type ApolloPhase1FeatureFlags = {
  readonly nnEnabled: boolean;
  readonly numericReleaseBlocked: boolean;
  readonly showProvisionalStatus: boolean;
  readonly disableResultPublication: boolean;
  readonly disableNumericExecution: boolean;
};

export function parseApolloPhase1Flag(raw: string | undefined): boolean {
  return raw === "true";
}

function parseFailClosedApolloPhase1Guard(
  raw: string | undefined,
  defaultValue: boolean,
): boolean {
  if (raw === undefined || raw === "") {
    return defaultValue;
  }
  if (raw === "true") return true;
  if (raw === "false") return false;
  return defaultValue;
}

function getApolloPhase1Env(): Record<string, string | undefined> {
  const meta = import.meta as ImportMeta & { env?: Record<string, string | undefined> };
  return meta.env ?? {};
}

export function resolveApolloPhase1FeatureFlags(): ApolloPhase1FeatureFlags {
  const env = getApolloPhase1Env();
  const nnEnabled =
    parseApolloPhase1Flag(env[APOLLO_PHASE1_NN_ENABLED_FLAG_NAME]) ||
    parseApolloPhase1Flag(env[APOLLO_PHASE1_FLAG_NAME]);

  return {
    nnEnabled,
    numericReleaseBlocked: parseFailClosedApolloPhase1Guard(
      env[APOLLO_PHASE1_NUMERIC_RELEASE_BLOCKED_FLAG_NAME],
      true,
    ),
    showProvisionalStatus: parseFailClosedApolloPhase1Guard(
      env[APOLLO_PHASE1_SHOW_PROVISIONAL_STATUS_FLAG_NAME],
      true,
    ),
    disableResultPublication: parseFailClosedApolloPhase1Guard(
      env[APOLLO_PHASE1_DISABLE_RESULT_PUBLICATION_FLAG_NAME],
      true,
    ),
    disableNumericExecution: parseFailClosedApolloPhase1Guard(
      env[APOLLO_PHASE1_DISABLE_NUMERIC_EXECUTION_FLAG_NAME],
      true,
    ),
  };
}

export function isApolloPhase1Enabled(): boolean {
  return resolveApolloPhase1FeatureFlags().nnEnabled;
}
