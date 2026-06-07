import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../data/defaultProject";
import { buildEigenAnalysisRequest, buildInfluenceAnalysisRequest } from "./client";

describe("saved analysis request builders", () => {
  it("reconstructs eigen analysis options from analysisSettings", () => {
    const project = createDefaultProject();
    project.analysisSettings.eigen = {
      massCaseId: "mass-1",
      modeCount: 2,
    };

    expect(buildEigenAnalysisRequest(project)).toMatchObject({
      project,
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
