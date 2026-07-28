import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import {
  APOLLO_PHASE1_UNIT2_SCHEMA_VERSION,
  buildApolloPhase1Unit2ReferenceUsage,
  hydrateApolloPhase1Unit2FromPersistence,
  serializeApolloPhase1Unit2ForPersistence,
  validateApolloPhase1Unit2Draft,
  withApolloPhase1Unit2Draft,
} from "../unit2Draft";

describe("apollo unit2 draft", () => {
  it("hydrates a legacy project into the unit2 sidecar draft", () => {
    const result = hydrateApolloPhase1Unit2FromPersistence(createDefaultProject());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.project.apolloPhase1Unit2?.schemaVersion).toBe(APOLLO_PHASE1_UNIT2_SCHEMA_VERSION);
    expect(result.project.apolloPhase1Unit2?.nodes).toHaveLength(result.project.nodes.length);
    expect(result.project.apolloPhase1Unit2?.members).toHaveLength(result.project.members.length);
  });

  it("preserves updated metadata during serialization", () => {
    const project = withApolloPhase1Unit2Draft(createDefaultProject(), (draft) => ({
      ...draft,
      metadata: {
        ...draft.metadata,
        name: "Apollo Unit2 Saved",
        description: "Non-numeric round-trip",
      },
    }));

    const result = serializeApolloPhase1Unit2ForPersistence(project);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.project.project.name).toBe("Apollo Unit2 Saved");
    expect(result.project.apolloPhase1Unit2?.metadata.name).toBe("Apollo Unit2 Saved");
    expect(result.project.apolloPhase1Unit2?.metadata.localDraftStatus).toBe("saved");
  });

  it("fails closed on unknown draft schema versions", () => {
    const project = createDefaultProject();
    const result = hydrateApolloPhase1Unit2FromPersistence({
      ...project,
      apolloPhase1Unit2: {
        schemaVersion: "0.0.1",
      } as unknown as NonNullable<typeof project.apolloPhase1Unit2>,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostics[0]).toContain(APOLLO_PHASE1_UNIT2_SCHEMA_VERSION);
  });

  it("reports invalid references and duplicate identifiers", () => {
    const hydrated = hydrateApolloPhase1Unit2FromPersistence(createDefaultProject());
    expect(hydrated.ok).toBe(true);
    if (!hydrated.ok) return;
    const brokenProject = withApolloPhase1Unit2Draft(hydrated.project, (draft) => ({
      ...draft,
      nodes: [...draft.nodes, { ...draft.nodes[0] }],
      members: [
        {
          ...draft.members[0],
          id: "BROKEN",
          nodeI: "MISSING-I",
          nodeJ: "MISSING-I",
          materialRefId: "MISSING-MATERIAL",
        },
      ],
      supports: [
        {
          ...draft.supports[0],
          id: "SUP-BROKEN",
          nodeId: "MISSING-SUPPORT",
          ux: "UNDEFINED",
          uy: "UNDEFINED",
          uz: "UNDEFINED",
          rx: "UNDEFINED",
          ry: "UNDEFINED",
          rz: "UNDEFINED",
        },
      ],
    }));

    const draft = brokenProject.apolloPhase1Unit2!;
    const validation = validateApolloPhase1Unit2Draft(draft);
    expect(validation.errors.map((entry) => entry.code)).toEqual(
      expect.arrayContaining([
        "APOLLO_node_DUPLICATE_ID",
        "APOLLO_MEMBER_NODE_REFERENCE_INVALID",
        "APOLLO_MEMBER_SELF_REFERENCE",
        "APOLLO_MEMBER_MATERIAL_REFERENCE_INVALID",
        "APOLLO_SUPPORT_NODE_REFERENCE_INVALID",
      ]),
    );
    expect(validation.warnings.map((entry) => entry.code)).toContain("APOLLO_SUPPORT_ALL_UNDEFINED");
  });

  it("tracks reference usage across nodes, supports, and materials", () => {
    const hydrated = hydrateApolloPhase1Unit2FromPersistence(createDefaultProject());
    expect(hydrated.ok).toBe(true);
    if (!hydrated.ok) return;
    const usage = buildApolloPhase1Unit2ReferenceUsage(hydrated.project.apolloPhase1Unit2!);
    expect(usage.nodeToMemberIds.get("G1")).toEqual(expect.arrayContaining(["MG0", "MG1", "MP1"]));
    expect(usage.nodeToSupportIds.get("G0")).toEqual(["SUP-1"]);
    expect(usage.materialToMemberIds.get("MAT_DECK")).toEqual(
      expect.arrayContaining(["MG0", "MG1", "MG2", "MG3", "MG4"]),
    );
  });
});
