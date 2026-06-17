import { useCallback, useState } from "react";
import { ApiClientError, resolveApiUrl } from "../api/client";
import type { ProjectModel, StructuredMessage } from "../types";
import type {
  TimeHistoryAnalysisEnvelope,
  TimeHistoryAnalysisRequest,
  TimeHistoryAnalysisResponse,
  TimeHistoryHookState,
} from "./types";

const endpoint = "/api/analysis/time-history";

export function useTimeHistoryAnalysis() {
  const [state, setState] = useState<TimeHistoryHookState>({
    loading: false,
    result: null,
    error: null,
  });

  const run = useCallback(async (project: ProjectModel, overrides: Omit<TimeHistoryAnalysisRequest, "project"> = {}) => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const requestProject = cloneProject(project);
      const response = await fetch(resolveApiUrl(endpoint), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: requestProject, ...overrides }),
      });
      const payload = (await response.json().catch(() => null)) as TimeHistoryAnalysisResponse | null;
      if (!response.ok || !payload?.result) {
        throw httpError(response, payload);
      }

      const result = payload.result;
      const failedEnvelope = result.analysisSummary.status === "failed";
      const error = failedEnvelope ? result.errors[0] ?? envelopeError() : null;
      setState({ loading: false, result, error });
      return result;
    } catch (error) {
      const structured = toStructuredMessage(error);
      setState({ loading: false, result: null, error: structured });
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ loading: false, result: null, error: null });
  }, []);

  return { ...state, run, reset };
}

function httpError(response: Response, payload: TimeHistoryAnalysisResponse | null): ApiClientError {
  const message =
    payload?.result?.errors?.[0]?.message ??
    `Request failed with status ${response.status}`;
  return new ApiClientError(message, "TIME_HISTORY_API_ERROR", response.status);
}

function toStructuredMessage(error: unknown): StructuredMessage {
  if (error instanceof ApiClientError) {
    return {
      code: error.code,
      message: error.message,
      path: null,
      entityType: null,
      entityId: null,
    };
  }
  return {
    code: "TIME_HISTORY_NETWORK_ERROR",
    message: networkErrorMessage(),
    path: null,
    entityType: null,
    entityId: null,
  };
}

function cloneProject(project: ProjectModel): ProjectModel {
  if (typeof structuredClone === "function") return structuredClone(project);
  return JSON.parse(JSON.stringify(project)) as ProjectModel;
}

function networkErrorMessage(): string {
  return "Network request failed.";
}

function envelopeError(): StructuredMessage {
  return {
    code: "TIME_HISTORY_FAILED",
    message: "Time history analysis returned a failed envelope.",
    path: null,
    entityType: null,
    entityId: null,
  };
}
