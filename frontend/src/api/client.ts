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

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = payload?.detail ?? payload;
    const message =
      typeof detail?.message === "string"
        ? detail.message
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }
  return payload as T;
}

export const apiClient = {
  validateProject(project: ProjectModel): Promise<ValidationResponse> {
    return postJson<ValidationResponse>("/api/projects/validate", { project });
  },

  runAnalysis(project: ProjectModel): Promise<AnalysisRunResponse> {
    return postJson<AnalysisRunResponse>("/api/analysis/run", { project });
  },

  async loadExamples(): Promise<ExampleResponse["examples"]> {
    const response = await fetch("/api/examples");
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    const payload = (await response.json()) as ExampleResponse;
    return payload.examples;
  },
};
