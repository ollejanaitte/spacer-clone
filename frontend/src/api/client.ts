import type { AnalysisResult, ProjectModel, ValidationResponse } from "../types";

type AnalysisRunResponse = {
  result: AnalysisResult;
  csv: string | null;
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

  runAnalysis(project: ProjectModel): Promise<AnalysisRunResponse> {
    return postJson<AnalysisRunResponse>("/api/analysis/run", {
      project,
      options: { returnCsv: false },
    });
  },

  saveProject(fileName: string, project: ProjectModel): Promise<SaveProjectResponse> {
    return postJson<SaveProjectResponse>("/api/projects/save", { fileName, project });
  },

  async loadProject(fileName: string): Promise<ProjectModel> {
    const response = await postJson<LoadProjectResponse>("/api/projects/load", { fileName });
    return response.project;
  },

  async loadExamples(): Promise<ExampleResponse["examples"]> {
    const response = await fetchJson("/api/examples");
    const payload = await parseJsonResponse<ExampleResponse>(response);
    return payload.examples;
  },
};
