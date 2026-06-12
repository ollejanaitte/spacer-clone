import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../data/defaultProject";
import {
  buildBackendProject,
  buildEigenAnalysisRequest,
  buildInfluenceAnalysisRequest,
  buildResponseSpectrumAnalysisRequest,
  resolveApiUrl,
} from "./client";

describe("API URL resolution", () => {
  it("uses the packaged backend for file protocol pages", () => {
    expect(resolveApiUrl("/api/examples", "file:")).toBe(
      "http://127.0.0.1:8000/api/examples",
    );
  });

  it("keeps relative API paths for the Vite development proxy", () => {
    expect(resolveApiUrl("/api/examples", "http:")).toBe("/api/examples");
  });
});

describe("saved analysis request builders", () => {
  it("keeps response spectrum settings in saved projects but removes them from backend model payloads", () => {
    const project = createDefaultProject();
    project.analysisSettings.responseSpectrum = {
      massCaseId: "mass-1",
      modeCount: 4,
      spectrumCaseId: "saved-spectrum",
      direction: "Y",
      dampingRatio: 0.03,
      targetCumulativeMassRatio: 0.95,
      spectrumPoints: [
        { period: 0, value: 0 },
        { period: 0.5, value: 1.2 },
      ],
    };

    const backendProject = buildBackendProject(project);

    expect(project.analysisSettings.responseSpectrum?.spectrumCaseId).toBe(
      "saved-spectrum",
    );
    expect(backendProject.analysisSettings.responseSpectrum).toBeUndefined();
    expect(backendProject.analysisSettings.eigen).toEqual(
      project.analysisSettings.eigen,
    );
  });

  it("sends response spectrum options at the endpoint top level with a backend-compatible project", () => {
    const project = createDefaultProject();
    project.analysisSettings.responseSpectrum = {
      massCaseId: "mass-1",
      modeCount: 4,
      spectrumCaseId: "saved-spectrum",
      direction: "Z",
      dampingRatio: 0.02,
      targetCumulativeMassRatio: 0.8,
      spectrumPoints: [
        { period: 0, value: 0 },
        { period: 1, value: 1 },
      ],
    };

    const request = buildResponseSpectrumAnalysisRequest(project);

    expect(request).toMatchObject({
      massCaseId: "mass-1",
      modeCount: 4,
      spectrumCaseId: "saved-spectrum",
      direction: "Z",
      dampingRatio: 0.02,
      targetCumulativeMassRatio: 0.8,
      spectrumPoints: [
        { period: 0, value: 0 },
        { period: 1, value: 1 },
      ],
    });
    expect(request.project.analysisSettings.responseSpectrum).toBeUndefined();
  });

  it("replaces blank response spectrum identifiers with existing defaults", () => {
    const project = createDefaultProject();
    project.analysisSettings.responseSpectrum = {
      massCaseId: " ",
      modeCount: 3,
      spectrumCaseId: "",
      direction: "X",
      dampingRatio: 0.05,
      targetCumulativeMassRatio: 0.9,
      spectrumPoints: [
        { period: 0, value: 1 },
        { period: 1, value: 1 },
      ],
    };

    expect(buildResponseSpectrumAnalysisRequest(project)).toMatchObject({
      massCaseId: "mass-1",
      spectrumCaseId: "spec-1",
    });
  });

  it("reconstructs eigen analysis options from analysisSettings", () => {
    const project = createDefaultProject();
    project.analysisSettings.eigen = {
      massCaseId: "mass-1",
      modeCount: 2,
    };

    expect(buildEigenAnalysisRequest(project)).toMatchObject({
      massCaseId: "mass-1",
      modeCount: 2,
      normalization: "mass",
    });
  });

  it("reconstructs influence line, targets, and stations from analysisSettings", () => {
    const project = createDefaultProject();
    project.analysisSettings.influence = {
      caseId: "saved-influence",
      line: {
        id: "saved-line",
        memberId: "M1",
        stationCount: 17,
        direction: { x: 0, y: 0, z: -1 },
        magnitude: 2.5,
      },
      targets: [
        {
          id: "saved-moment",
          type: "memberEndForce",
          memberId: "M1",
          component: "Mz",
          end: "i",
        },
      ],
    };

    const request = buildInfluenceAnalysisRequest(project);

    expect(request.caseId).toBe("saved-influence");
    expect(request.line).toEqual(project.analysisSettings.influence.line);
    expect(request.targets).toEqual(project.analysisSettings.influence.targets);
  });
});
