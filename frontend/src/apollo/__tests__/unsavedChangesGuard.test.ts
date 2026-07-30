import { describe, expect, it, vi } from "vitest";
import { resolveUnsavedChangesGuard } from "../unsavedChangesGuard";

describe("resolveUnsavedChangesGuard", () => {
  it("proceeds immediately when the project is clean", async () => {
    const prompt = vi.fn();
    const save = vi.fn();
    const discard = vi.fn();
    const result = await resolveUnsavedChangesGuard({
      isDirty: false,
      message: "test",
      prompt,
      save,
      discard,
    });
    expect(result).toBe("proceed");
    expect(prompt).not.toHaveBeenCalled();
  });

  it("aborts when save fails", async () => {
    const result = await resolveUnsavedChangesGuard({
      isDirty: true,
      message: "test",
      prompt: async () => "save",
      save: async () => false,
      discard: vi.fn(),
    });
    expect(result).toBe("abort");
  });

  it("proceeds on discard without calling save", async () => {
    const save = vi.fn();
    const discard = vi.fn();
    const result = await resolveUnsavedChangesGuard({
      isDirty: true,
      message: "test",
      prompt: async () => "discard",
      save,
      discard,
    });
    expect(result).toBe("proceed");
    expect(save).not.toHaveBeenCalled();
    expect(discard).toHaveBeenCalledTimes(1);
  });

  it("aborts on cancel", async () => {
    const result = await resolveUnsavedChangesGuard({
      isDirty: true,
      message: "test",
      prompt: async () => "cancel",
      save: async () => true,
    });
    expect(result).toBe("abort");
  });
});
