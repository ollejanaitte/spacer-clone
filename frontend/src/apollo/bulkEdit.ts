import type {
  ApolloPhase1Unit2Draft,
  ApolloPhase1Unit2MaterialReference,
  ApolloPhase1Unit2Member,
  ApolloPhase1Unit2Node,
  ApolloPhase1Unit2Support,
} from "../types";
import type { ApolloEntityKind, ApolloEntityRef } from "./selection";

export type ApolloBulkEditableField =
  | "label"
  | "displayName"
  | "active";

export type ApolloBulkEditSelection =
  | {
      readonly ok: true;
      readonly kind: ApolloEntityKind;
      readonly refs: readonly ApolloEntityRef[];
      readonly allowedFields: readonly ApolloBulkEditableField[];
    }
  | { readonly ok: false; readonly message: string };

export type ApolloBulkEditInput =
  | { readonly field: "active"; readonly value: boolean }
  | { readonly field: "label" | "displayName"; readonly value: string };

export type ApolloBulkEditApplyResult =
  | { readonly ok: true; readonly draft: ApolloPhase1Unit2Draft; readonly affectedCount: number }
  | { readonly ok: false; readonly message: string };

const ALLOWED_FIELDS: Record<ApolloEntityKind, readonly ApolloBulkEditableField[]> = {
  node: ["label", "active"],
  member: ["label", "active"],
  support: ["label", "active"],
  material: ["displayName", "active"],
};

export function resolveApolloBulkEditSelection(
  refs: readonly ApolloEntityRef[],
): ApolloBulkEditSelection {
  if (refs.length < 2) {
    return { ok: false, message: "一括編集は同じ種類の行を2件以上選択してください。" };
  }
  const kind = refs[0]?.kind;
  if (!kind || refs.some((ref) => ref.kind !== kind)) {
    return { ok: false, message: "異なる種類の行は一括編集できません。" };
  }
  return {
    ok: true,
    kind,
    refs,
    allowedFields: ALLOWED_FIELDS[kind],
  };
}

function ensureValidText(value: string): boolean {
  return value.trim().length > 0;
}

function updateRows<T extends { id: string }>(
  rows: readonly T[],
  ids: ReadonlySet<string>,
  updater: (row: T) => T,
): T[] {
  return rows.map((row) => (ids.has(row.id) ? updater(row) : row));
}

export function applyApolloBulkEdit(
  draft: ApolloPhase1Unit2Draft,
  refs: readonly ApolloEntityRef[],
  input: ApolloBulkEditInput,
): ApolloBulkEditApplyResult {
  const selection = resolveApolloBulkEditSelection(refs);
  if (!selection.ok) {
    return selection;
  }
  if (!selection.allowedFields.includes(input.field)) {
    return { ok: false, message: "この項目は選択中の種類に対して一括編集できません。" };
  }
  if ((input.field === "label" || input.field === "displayName") && !ensureValidText(input.value)) {
    return { ok: false, message: "一括編集の文字列値は空にできません。" };
  }

  const ids = new Set(selection.refs.map((ref) => ref.id));
  switch (selection.kind) {
    case "node":
      return {
        ok: true,
        affectedCount: selection.refs.length,
        draft: {
          ...draft,
          nodes: updateRows(draft.nodes, ids, (row) => {
            const next = { ...row } as ApolloPhase1Unit2Node;
            if (input.field === "label") next.label = input.value;
            if (input.field === "active") next.active = input.value;
            return next;
          }),
        },
      };
    case "member":
      return {
        ok: true,
        affectedCount: selection.refs.length,
        draft: {
          ...draft,
          members: updateRows(draft.members, ids, (row) => {
            const next = { ...row } as ApolloPhase1Unit2Member;
            if (input.field === "label") next.label = input.value;
            if (input.field === "active") next.active = input.value;
            return next;
          }),
        },
      };
    case "support":
      return {
        ok: true,
        affectedCount: selection.refs.length,
        draft: {
          ...draft,
          supports: updateRows(draft.supports, ids, (row) => {
            const next = { ...row } as ApolloPhase1Unit2Support;
            if (input.field === "label") next.label = input.value;
            if (input.field === "active") next.active = input.value;
            return next;
          }),
        },
      };
    case "material":
      return {
        ok: true,
        affectedCount: selection.refs.length,
        draft: {
          ...draft,
          materialReferences: updateRows(draft.materialReferences, ids, (row) => {
            const next = { ...row } as ApolloPhase1Unit2MaterialReference;
            if (input.field === "displayName") next.displayName = input.value;
            if (input.field === "active") next.active = input.value;
            return next;
          }),
        },
      };
  }
}
