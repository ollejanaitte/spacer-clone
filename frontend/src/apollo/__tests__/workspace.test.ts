// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import {
  APOLLO_WORKSPACE_STORAGE_KEY,
  APOLLO_WORKSPACE_STORE_MALFORMED_ID,
  duplicateApolloWorkspaceEntry,
  listApolloWorkspaceMalformedEntries,
  saveApolloWorkspaceEntry,
} from "../workspace";

describe("workspace malformed snapshots", () => {
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

  it("retains malformed entries with diagnostics instead of silently deleting them", () => {
    window.localStorage.setItem(
      APOLLO_WORKSPACE_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        projects: [
          {
            workspaceId: "apollo-workspace-bad",
            projectId: "bad",
            name: "Broken",
            description: "",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
            project: {
              nodes: [],
              members: [],
              project: {
                id: "bad",
                name: "Broken",
                description: "",
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-01T00:00:00.000Z",
              },
              apolloPhase1Unit2: {
                schemaVersion: 0,
              },
            },
          },
        ],
      }),
    );

    const malformed = listApolloWorkspaceMalformedEntries();
    expect(malformed).toHaveLength(1);
    expect(malformed[0]?.workspaceId).toBe("apollo-workspace-bad");
    expect(malformed[0]?.diagnostics.length).toBeGreaterThan(0);
  });

  it("surfaces unparseable workspace store JSON as a non-destructive malformed snapshot diagnostic", () => {
    window.localStorage.setItem(APOLLO_WORKSPACE_STORAGE_KEY, "{not-valid-json");

    const malformed = listApolloWorkspaceMalformedEntries();
    expect(malformed).toHaveLength(1);
    expect(malformed[0]?.workspaceId).toBe(APOLLO_WORKSPACE_STORE_MALFORMED_ID);
    expect(malformed[0]?.diagnostics).toContain("Workspace store JSON could not be parsed.");
    expect(malformed[0]?.raw).toBe("{not-valid-json");
  });

  it("duplicates workspace entries with deterministic names and fresh project ids", () => {
    const project = createDefaultProject();
    const entries = saveApolloWorkspaceEntry(project);
    const sourceId = entries[0]?.workspaceId;
    expect(sourceId).toBeDefined();
    const duplicated = duplicateApolloWorkspaceEntry(sourceId!);
    expect(duplicated[0]?.name).toBe(`${entries[0]?.name}-copy`);
    expect(duplicated[0]?.projectId).not.toBe(entries[0]?.projectId);
  });
});
