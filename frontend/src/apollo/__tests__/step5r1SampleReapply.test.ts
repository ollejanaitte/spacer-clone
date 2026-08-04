// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import {
  applySimpleSingleSpanSampleInput,
  clearBridgeStructureInput,
  detectSampleReapply,
  diffProjectForSampleReapply,
  executeSampleReapplyCreateNew,
  executeSampleReapplyDirect,
  executeSampleReapplyReplace,
  getBridgeStructureInputDraft,
  withBridgeStructureField,
} from "../bridgeStructure";
import { listApolloWorkspaceEntries } from "../workspace";

describe("Step 5-R R1 sample reapply confirmation", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem(key: string) {
        return store.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        store.set(key, value);
      },
      removeItem(key: string) {
        store.delete(key);
      },
      clear() {
        store.clear();
      },
    });
  });

  it("allows direct apply on empty / cleared project without confirmation", () => {
    const empty = clearBridgeStructureInput(createDefaultProject());
    const detection = detectSampleReapply(empty, "SIMPLE_SINGLE");
    expect(detection.kind).toBe("NEW_EMPTY_PROJECT");
    expect(detection.requiresConfirmation).toBe(false);
    const result = executeSampleReapplyDirect(empty, "SIMPLE_SINGLE");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(getBridgeStructureInputDraft(result.project).spanLength).toBe(30);
  });

  it("requires confirmation when project already has sample or edits", () => {
    const applied = applySimpleSingleSpanSampleInput(createDefaultProject());
    const detection = detectSampleReapply(applied, "SIMPLE_SINGLE");
    expect(detection.requiresConfirmation).toBe(true);
    expect(["EXISTING_UNCHANGED_SAMPLE", "EXISTING_EDITED_PROJECT"]).toContain(detection.kind);
  });

  it("diffs edited fields by category", () => {
    let project = applySimpleSingleSpanSampleInput(createDefaultProject());
    project = withBridgeStructureField(project, "girderDepth", 2.5);
    const candidate = applySimpleSingleSpanSampleInput(createDefaultProject());
    const diff = diffProjectForSampleReapply(project, candidate, "SIMPLE_SINGLE");
    expect(diff.changedFieldCount + diff.addedEntityCount + diff.removedEntityCount).toBeGreaterThan(0);
    expect(diff.entries.some((e) => e.path === "girderDepth")).toBe(true);
    expect(diff.byCategory.girders_deck).toBeGreaterThan(0);
  });

  it("replace applies sample and generate; cancel path keeps caller in control", () => {
    let project = applySimpleSingleSpanSampleInput(createDefaultProject());
    project = withBridgeStructureField(project, "girderDepth", 2.7);
    const before = getBridgeStructureInputDraft(project).girderDepth;
    const result = executeSampleReapplyReplace(project, "SIMPLE_SINGLE");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(getBridgeStructureInputDraft(result.project).girderDepth).toBe(2.0);
    expect(before).toBe(2.7);
  });

  it("rolls back replace on controlled generation failure", () => {
    let project = applySimpleSingleSpanSampleInput(createDefaultProject());
    project = withBridgeStructureField(project, "girderDepth", 2.7);
    const result = executeSampleReapplyReplace(project, "SIMPLE_SINGLE", {
      forceGenerateFailure: true,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.rolledBack).toBe(true);
    expect(getBridgeStructureInputDraft(result.project).girderDepth).toBe(2.7);
  });

  it("create_new preserves current project in workspace and opens sample project", () => {
    let project = applySimpleSingleSpanSampleInput(createDefaultProject());
    project = withBridgeStructureField(project, "girderDepth", 2.4);
    const originalId = project.project.id;
    const result = executeSampleReapplyCreateNew(project, "SIMPLE_SINGLE");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.project.project.id).not.toBe(originalId);
    expect(getBridgeStructureInputDraft(result.project).girderDepth).toBe(2.0);
    expect(listApolloWorkspaceEntries().length).toBeGreaterThan(0);
  });

  it("marks dirty-unsaved detection when requested", () => {
    const project = applySimpleSingleSpanSampleInput(createDefaultProject());
    const detection = detectSampleReapply(project, "SIMPLE_SINGLE", { dirtyUnsaved: true });
    expect(detection.kind).toBe("DIRTY_UNSAVED");
    expect(detection.requiresConfirmation).toBe(true);
  });
});
