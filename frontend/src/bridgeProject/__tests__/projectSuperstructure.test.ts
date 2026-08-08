import { describe, expect, it } from "vitest";
import {
  getApolloBridgeProjectSuperstructure,
  hydrateApolloBridgeProjectSuperstructureFromPersistence,
  serializeApolloBridgeProjectSuperstructureForPersistence,
  withApolloBridgeProjectSuperstructure,
} from "../projectSuperstructure";
import { buildBridgeProjectSuperstructure } from "../superstructureAdapter";
import { buildBridgeProjectAlignment } from "../alignmentAdapter";
import { buildBridgeProjectGeometry } from "../bridgeGeometryGenerator";
import { buildBoundGeometryInput } from "../superstructureBinding";
import { DefaultGeometryEngine } from "../../apollo/geometry/engine";
import { buildMountainDraft } from "../../liner/samples/mountain-viaduct-500/fixture";
import { createDefaultProject } from "../../data/defaultProject";
import type { ProjectModel } from "../../types";

function superstructureRecord() {
  const draft = buildMountainDraft();
  const alignment = buildBridgeProjectAlignment(draft);
  const geometry = buildBridgeProjectGeometry(alignment, draft.piers, draft.spans);
  const commonModel = buildCommonBridgeModel(alignment, geometry);
  const input = buildBoundGeometryInput(commonModel, {
    girderOffsetsM: { "GIRDER-1": -4.0, "GIRDER-2": 4.0 },
    girderIds: ["GIRDER-1", "GIRDER-2"],
  });
  const snapshot = new DefaultGeometryEngine(draft).generateSnapshot(input);
  return buildBridgeProjectSuperstructure(snapshot, { spanSystem: "continuous" });
}

// eslint-disable-next-line import/no-extraneous-dependencies
import { buildCommonBridgeModel } from "../cbdmDocument";

describe("BridgeProject.Superstructure sidecar persistence (Phase 3-4)", () => {
  it("round-trips the sidecar through serialize + hydrate unchanged", () => {
    const project = withApolloBridgeProjectSuperstructure(
      createDefaultProject(),
      superstructureRecord(),
    );
    const serialized = serializeApolloBridgeProjectSuperstructureForPersistence(project);
    expect(serialized.ok).toBe(true);
    const hydrated = hydrateApolloBridgeProjectSuperstructureFromPersistence(project);
    if (!hydrated.ok) throw new Error(hydrated.diagnostics.join("; "));
    expect(getApolloBridgeProjectSuperstructure(hydrated.project)).toEqual(
      getApolloBridgeProjectSuperstructure(project),
    );
  });

  it("hydrates a JSON-string sidecar to the canonical record", () => {
    const record = superstructureRecord();
    const project = withApolloBridgeProjectSuperstructure(
      createDefaultProject(),
      record,
    );
    const asString = {
      ...project,
      apolloBridgeProjectSuperstructure: JSON.stringify(record),
    } as unknown as ProjectModel;
    const hydrated = hydrateApolloBridgeProjectSuperstructureFromPersistence(asString);
    if (!hydrated.ok) throw new Error(hydrated.diagnostics.join("; "));
    expect(getApolloBridgeProjectSuperstructure(hydrated.project)).toEqual(record);
  });

  it("fails closed on an unsupported schemaVersion", () => {
    const record = { ...superstructureRecord(), schemaVersion: "9.9.9" } as never;
    const project = withApolloBridgeProjectSuperstructure(createDefaultProject(), record);
    const serialized = serializeApolloBridgeProjectSuperstructureForPersistence(project);
    expect(serialized.ok).toBe(false);
  });

  it("passes through when the sidecar is absent", () => {
    const project = createDefaultProject();
    const serialized = serializeApolloBridgeProjectSuperstructureForPersistence(project);
    const hydrated = hydrateApolloBridgeProjectSuperstructureFromPersistence(project);
    if (!hydrated.ok) throw new Error(hydrated.diagnostics.join("; "));
    expect(serialized.ok).toBe(true);
    expect(getApolloBridgeProjectSuperstructure(hydrated.project)).toBeUndefined();
  });
});
