import type { CrossSectionOffsetLineDraft, CrossSectionTemplateDraft } from "../schema/types";

export const CENTERLINE_OFFSET_EPSILON_M = 1e-9;

export function isCenterlineOffsetLine(line: CrossSectionOffsetLineDraft): boolean {
  return Math.abs(line.offset) < CENTERLINE_OFFSET_EPSILON_M;
}

export function nextOffsetLineId(
  prefix: string,
  offsetLines: readonly CrossSectionOffsetLineDraft[],
): string {
  const ids = new Set(offsetLines.map((line) => line.id));
  let index = offsetLines.length;
  let candidate = `${prefix}-${index}`;
  while (ids.has(candidate)) {
    index += 1;
    candidate = `${prefix}-${index}`;
  }
  return candidate;
}

export function createOffsetLineDraft(
  offsetLines: readonly CrossSectionOffsetLineDraft[],
  patch: Partial<CrossSectionOffsetLineDraft> = {},
): CrossSectionOffsetLineDraft {
  return {
    id: patch.id ?? nextOffsetLineId("OL", offsetLines),
    offset: patch.offset ?? 0,
    elevation: patch.elevation ?? 0,
    ...(patch.role ? { role: patch.role } : { role: "custom" as const }),
    ...(patch.label ? { label: patch.label } : {}),
  };
}

export function insertOffsetLine(
  template: CrossSectionTemplateDraft,
  index: number,
  position: "before" | "after",
  patch: Partial<CrossSectionOffsetLineDraft> = {},
): CrossSectionTemplateDraft {
  const clamped = Math.max(0, Math.min(index, template.offsetLines.length));
  const insertAt = position === "before" ? clamped : Math.min(clamped + 1, template.offsetLines.length);
  const nextLine = createOffsetLineDraft(template.offsetLines, {
    ...patch,
    // Default new offset near neighbors to reduce accidental centerline collision.
    offset:
      patch.offset
      ?? suggestInsertOffset(template.offsetLines, insertAt),
  });
  const offsetLines = [...template.offsetLines];
  offsetLines.splice(insertAt, 0, nextLine);
  return { ...template, offsetLines };
}

export function appendOffsetLine(
  template: CrossSectionTemplateDraft,
  patch: Partial<CrossSectionOffsetLineDraft> = {},
): CrossSectionTemplateDraft {
  return insertOffsetLine(template, Math.max(template.offsetLines.length - 1, 0), "after", patch);
}

export function removeOffsetLineAt(
  template: CrossSectionTemplateDraft,
  targetLineIndex: number,
): CrossSectionTemplateDraft {
  const target = template.offsetLines[targetLineIndex];
  if (!target) {
    return template;
  }
  if (isCenterlineOffsetLine(target)) {
    return template;
  }
  if (template.offsetLines.length <= 1) {
    return template;
  }
  return {
    ...template,
    offsetLines: template.offsetLines.filter((_, lineIndex) => lineIndex !== targetLineIndex),
  };
}

export function moveOffsetLine(
  template: CrossSectionTemplateDraft,
  targetLineIndex: number,
  direction: "up" | "down",
): CrossSectionTemplateDraft {
  const target = template.offsetLines[targetLineIndex];
  if (!target || isCenterlineOffsetLine(target)) {
    return template;
  }
  const swapIndex = direction === "up" ? targetLineIndex - 1 : targetLineIndex + 1;
  if (swapIndex < 0 || swapIndex >= template.offsetLines.length) {
    return template;
  }
  const neighbor = template.offsetLines[swapIndex]!;
  if (isCenterlineOffsetLine(neighbor)) {
    // Allow swapping past centerline only if we skip it (swap with next available).
    const skipIndex = direction === "up" ? swapIndex - 1 : swapIndex + 1;
    if (skipIndex < 0 || skipIndex >= template.offsetLines.length) {
      return template;
    }
    if (isCenterlineOffsetLine(template.offsetLines[skipIndex]!)) {
      return template;
    }
    return swapIndices(template, targetLineIndex, skipIndex);
  }
  return swapIndices(template, targetLineIndex, swapIndex);
}

export function canMoveOffsetLineUp(
  template: CrossSectionTemplateDraft,
  targetLineIndex: number,
): boolean {
  const target = template.offsetLines[targetLineIndex];
  if (!target || isCenterlineOffsetLine(target) || targetLineIndex <= 0) {
    return false;
  }
  const neighbor = template.offsetLines[targetLineIndex - 1]!;
  if (!isCenterlineOffsetLine(neighbor)) {
    return true;
  }
  return targetLineIndex - 2 >= 0 && !isCenterlineOffsetLine(template.offsetLines[targetLineIndex - 2]!);
}

export function canMoveOffsetLineDown(
  template: CrossSectionTemplateDraft,
  targetLineIndex: number,
): boolean {
  const target = template.offsetLines[targetLineIndex];
  if (!target || isCenterlineOffsetLine(target) || targetLineIndex >= template.offsetLines.length - 1) {
    return false;
  }
  const neighbor = template.offsetLines[targetLineIndex + 1]!;
  if (!isCenterlineOffsetLine(neighbor)) {
    return true;
  }
  return (
    targetLineIndex + 2 < template.offsetLines.length
    && !isCenterlineOffsetLine(template.offsetLines[targetLineIndex + 2]!)
  );
}

export function canRemoveOffsetLine(
  template: CrossSectionTemplateDraft,
  targetLineIndex: number,
): boolean {
  const target = template.offsetLines[targetLineIndex];
  if (!target) {
    return false;
  }
  if (isCenterlineOffsetLine(target)) {
    return false;
  }
  return template.offsetLines.length > 1;
}

export function hasDuplicateOffsets(offsetLines: readonly CrossSectionOffsetLineDraft[]): boolean {
  const seen = new Set<string>();
  for (const line of offsetLines) {
    const key = line.offset.toFixed(6);
    if (seen.has(key)) {
      return true;
    }
    seen.add(key);
  }
  return false;
}

function swapIndices(
  template: CrossSectionTemplateDraft,
  leftIndex: number,
  rightIndex: number,
): CrossSectionTemplateDraft {
  const offsetLines = [...template.offsetLines];
  const left = offsetLines[leftIndex]!;
  const right = offsetLines[rightIndex]!;
  offsetLines[leftIndex] = right;
  offsetLines[rightIndex] = left;
  return { ...template, offsetLines };
}

function suggestInsertOffset(
  offsetLines: readonly CrossSectionOffsetLineDraft[],
  insertAt: number,
): number {
  if (offsetLines.length === 0) {
    return 0;
  }
  const left = offsetLines[insertAt - 1];
  const right = offsetLines[insertAt];
  if (left && right) {
    const mid = (left.offset + right.offset) / 2;
    if (Math.abs(mid) < CENTERLINE_OFFSET_EPSILON_M) {
      return left.offset + Math.sign(right.offset - left.offset || 1) * 0.5;
    }
    return mid;
  }
  if (left) {
    return left.offset + (left.offset >= 0 ? 1 : -1);
  }
  if (right) {
    return right.offset + (right.offset >= 0 ? 1 : -1);
  }
  return 1;
}
