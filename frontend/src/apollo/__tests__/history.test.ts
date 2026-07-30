import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import {
  APOLLO_HISTORY_LIMIT,
  createApolloHistoryState,
  pushApolloHistory,
  redoApolloHistory,
  undoApolloHistory,
} from "../history";

describe("apollo history", () => {
  it("coalesces consecutive text transactions for the same key", () => {
    const base = createDefaultProject();
    const first = {
      ...base,
      project: {
        ...base.project,
        name: "A",
      },
    };
    const second = {
      ...base,
      project: {
        ...base.project,
        name: "AB",
      },
    };

    let state = createApolloHistoryState();
    state = pushApolloHistory(state, base, first, { kind: "coalesced", key: "project:name" });
    state = pushApolloHistory(state, first, second, { kind: "coalesced", key: "project:name" });

    expect(state.past).toHaveLength(1);
    const undone = undoApolloHistory(state, second);
    expect(undone.project?.project.name).toBe(base.project.name);
  });

  it("invalidates redo when a new snapshot is pushed", () => {
    const base = createDefaultProject();
    const first = {
      ...base,
      project: {
        ...base.project,
        name: "first",
      },
    };
    const second = {
      ...base,
      project: {
        ...base.project,
        name: "second",
      },
    };

    let state = createApolloHistoryState();
    state = pushApolloHistory(state, base, first, { kind: "snapshot" });
    const undone = undoApolloHistory(state, first);
    state = pushApolloHistory(undone.state, base, second, { kind: "snapshot" });

    expect(state.future).toHaveLength(0);
  });

  it("supports redo after undo", () => {
    const base = createDefaultProject();
    const first = {
      ...base,
      project: {
        ...base.project,
        name: "first",
      },
    };

    let state = createApolloHistoryState();
    state = pushApolloHistory(state, base, first, { kind: "snapshot" });
    const undone = undoApolloHistory(state, first);
    const redone = redoApolloHistory(undone.state, undone.project ?? first);

    expect(redone.project?.project.name).toBe("first");
  });

  it("keeps only the latest 50 history entries", () => {
    let current = createDefaultProject();
    let state = createApolloHistoryState();

    for (let index = 0; index < APOLLO_HISTORY_LIMIT + 5; index += 1) {
      const next = {
        ...current,
        project: {
          ...current.project,
          name: `name-${index}`,
        },
      };
      state = pushApolloHistory(state, current, next, { kind: "snapshot" });
      current = next;
    }

    expect(state.past).toHaveLength(APOLLO_HISTORY_LIMIT);
    expect(state.past[0]?.project.project.name).toBe("name-4");
  });
});
