import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import { buildApolloClipboardPayload, applyApolloClipboardPaste } from "../clipboard";
import { getApolloPhase1Unit2Draft } from "../unit2Draft";

describe("apollo clipboard", () => {
  it("rejects mixed-kind copy", () => {
    const draft = getApolloPhase1Unit2Draft(createDefaultProject());
    const result = buildApolloClipboardPayload(
      draft,
      [
        { kind: "node", id: draft.nodes[0]!.id },
        { kind: "member", id: draft.members[0]!.id },
      ],
      "2026-07-30T00:00:00.000Z",
    );

    expect(result.ok).toBe(false);
  });

  it("duplicates nodes with deterministic remapped ids", () => {
    const draft = getApolloPhase1Unit2Draft(createDefaultProject());
    const payloadResult = buildApolloClipboardPayload(
      draft,
      [{ kind: "node", id: draft.nodes[0]!.id }],
      "2026-07-30T00:00:00.000Z",
    );
    expect(payloadResult.ok).toBe(true);
    if (!payloadResult.ok) return;

    const pasteResult = applyApolloClipboardPaste(draft, payloadResult.payload);
    expect(pasteResult.ok).toBe(true);
    if (!pasteResult.ok) return;

    expect(pasteResult.selectedRefs[0]?.kind).toBe("node");
    expect(pasteResult.selectedRefs[0]?.id).not.toBe(draft.nodes[0]!.id);
  });

  it("rejects support paste when the target node already has a support", () => {
    const draft = getApolloPhase1Unit2Draft(createDefaultProject());
    const payloadResult = buildApolloClipboardPayload(
      draft,
      [{ kind: "support", id: draft.supports[0]!.id }],
      "2026-07-30T00:00:00.000Z",
    );
    expect(payloadResult.ok).toBe(true);
    if (!payloadResult.ok) return;

    const pasteResult = applyApolloClipboardPaste(draft, payloadResult.payload);
    expect(pasteResult.ok).toBe(false);
  });
});
