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

declare const __APOLLO_PHASE1_MODE__: boolean;

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

function getApolloPhase1ModeDefaults(env: Record<string, string | undefined>): ApolloPhase1FeatureFlags {
  const apolloMode =
    env.MODE === "apollo" ||
    (typeof __APOLLO_PHASE1_MODE__ !== "undefined" && __APOLLO_PHASE1_MODE__);
  return {
    nnEnabled: apolloMode,
    numericReleaseBlocked: true,
    showProvisionalStatus: true,
    disableResultPublication: true,
    disableNumericExecution: true,
  };
}

export function resolveApolloPhase1FeatureFlags(): ApolloPhase1FeatureFlags {
  const env = getApolloPhase1Env();
  const modeDefaults = getApolloPhase1ModeDefaults(env);
  const nnEnabled =
    parseApolloPhase1Flag(env[APOLLO_PHASE1_NN_ENABLED_FLAG_NAME]) ||
    parseApolloPhase1Flag(env[APOLLO_PHASE1_FLAG_NAME]) ||
    modeDefaults.nnEnabled;

  return {
    nnEnabled,
    numericReleaseBlocked: parseFailClosedApolloPhase1Guard(
      env[APOLLO_PHASE1_NUMERIC_RELEASE_BLOCKED_FLAG_NAME],
      modeDefaults.numericReleaseBlocked,
    ),
    showProvisionalStatus: parseFailClosedApolloPhase1Guard(
      env[APOLLO_PHASE1_SHOW_PROVISIONAL_STATUS_FLAG_NAME],
      modeDefaults.showProvisionalStatus,
    ),
    disableResultPublication: parseFailClosedApolloPhase1Guard(
      env[APOLLO_PHASE1_DISABLE_RESULT_PUBLICATION_FLAG_NAME],
      modeDefaults.disableResultPublication,
    ),
    disableNumericExecution: parseFailClosedApolloPhase1Guard(
      env[APOLLO_PHASE1_DISABLE_NUMERIC_EXECUTION_FLAG_NAME],
      modeDefaults.disableNumericExecution,
    ),
  };
}

export function isApolloPhase1Enabled(): boolean {
  return resolveApolloPhase1FeatureFlags().nnEnabled;
}
