import { afterEach, describe, expect, it, vi } from "vitest";
import { createDefaultProject } from "../data/defaultProject";
import { apiClient } from "./client";
import { buildRunAnalysisIf3Metadata } from "../if3";
import { RunAnalysisIf3BindingError } from "../if3/runAnalysisBindingGuard";

describe("apiClient.runAnalysis IF3 binding", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("includes if3 in the POST body when provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          result: { analysisSummary: { status: "success" }, errors: [] },
          csv: null,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const project = createDefaultProject();
    const if3 = buildRunAnalysisIf3Metadata(project, { authoritative: true });
    await apiClient.runAnalysis(project, true, if3);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(body.if3).toEqual(if3);
    expect(body.options).toEqual({ returnCsv: true });
    expect(body.project.analysisSettings.responseSpectrum).toBeUndefined();
  });

  it("does not invent if3 when omitted", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          result: { analysisSummary: { status: "success" }, errors: [] },
          csv: null,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const project = createDefaultProject();
    await apiClient.runAnalysis(project, false);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(body.if3).toBeUndefined();
    expect(body.options).toEqual({ returnCsv: false });
  });

  it("rejects stale if3 metadata before calling fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const project = createDefaultProject();
    const if3 = buildRunAnalysisIf3Metadata(project);
    project.project = {
      ...project.project,
      name: "edited",
    };

    expect(() => apiClient.runAnalysis(project, false, if3)).toThrow(RunAnalysisIf3BindingError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
