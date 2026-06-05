import type { AnalysisResult, ProjectModel, ResultExports, ValidationResponse } from "../types";

type AnalysisRunResponse = {
  result: AnalysisResult;
  csv: ResultExports | null;
};

type EigenRunResponse = {
  result: AnalysisResult;
};

type ExampleResponse = {
  examples: Array<{
    id: string;
    name: string;
    description: string;
    project: ProjectModel;
  }>;
};

type SaveProjectResponse = {
  saved: boolean;
  fileName: string;
};

type LoadProjectResponse = {
  project: ProjectModel;
};

type AutosaveProjectResponse = {
  saved: boolean;
  fileName: "autosave.json";
};

type AutosaveCandidateResponse = {
  exists: boolean;
  fileName: "autosave.json";
  project: ProjectModel | null;
};

export class ApiClientError extends Error {
  readonly status: number | null;
  readonly code: string;

  constructor(message: string, code: string, status: number | null = null) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
  }
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetchJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJsonResponse<T>(response);
}

async function fetchJson(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (error) {
    throw new ApiClientError(
      error instanceof Error ? error.message : "Network request failed.",
      "NETWORK_ERROR",
    );
  }
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = payload?.detail ?? payload;
    const code = typeof detail?.code === "string" ? detail.code : "API_ERROR";
    const message =
      typeof detail?.message === "string"
        ? detail.message
        : `Request failed with status ${response.status}`;
    throw new ApiClientError(message, code, response.status);
  }
  return payload as T;
}

export const apiClient = {
  validateProject(project: ProjectModel): Promise<ValidationResponse> {
    return postJson<ValidationResponse>("/api/projects/validate", { project });
  },

  runAnalysis(project: ProjectModel, returnCsv = false): Promise<AnalysisRunResponse> {
    return postJson<AnalysisRunResponse>("/api/analysis/run", {
      project,
      options: { returnCsv },
    });
  },

  runEigenAnalysis(project: ProjectModel, massCaseId: string, modeCount: number): Promise<EigenRunResponse> {
    return postJson<EigenRunResponse>("/api/analysis/eigen", {
      project,
      massCaseId,
      modeCount,
      normalization: "mass",
    });
  },

  saveProject(fileName: string, project: ProjectModel): Promise<SaveProjectResponse> {
    return postJson<SaveProjectResponse>("/api/projects/save", { fileName, project });
  },

  async loadProject(fileName: string): Promise<ProjectModel> {
    const response = await postJson<LoadProjectResponse>("/api/projects/load", { fileName });
    return response.project;
  },

  autosaveProject(project: ProjectModel): Promise<AutosaveProjectResponse> {
    return postJson<AutosaveProjectResponse>("/api/projects/autosave", { project });
  },

  async loadAutosaveCandidate(): Promise<AutosaveCandidateResponse> {
    const response = await fetchJson("/api/projects/autosave");
    return parseJsonResponse<AutosaveCandidateResponse>(response);
  },

  async loadExamples(): Promise<ExampleResponse["examples"]> {
    const response = await fetchJson("/api/examples");
    const payload = await parseJsonResponse<ExampleResponse>(response);
    return payload.examples;
  },
};
