import type {
  ApolloPhase1Unit2Draft,
  ApolloPhase1Unit2MaterialReference,
  ApolloPhase1Unit2Member,
  ApolloPhase1Unit2Node,
  ApolloPhase1Unit2Support,
} from "../types";
import { nextApolloUnit2Id } from "./unit2Draft";
import type { ApolloEntityKind, ApolloEntityRef } from "./selection";

export const APOLLO_CLIPBOARD_SCHEMA_VERSION = "apollo-unit3-clipboard/v1";

type ApolloClipboardEntityMap = {
  readonly node: ApolloPhase1Unit2Node;
  readonly member: ApolloPhase1Unit2Member;
  readonly support: ApolloPhase1Unit2Support;
  readonly material: ApolloPhase1Unit2MaterialReference;
};

export type ApolloClipboardPayload = {
  readonly schemaVersion: typeof APOLLO_CLIPBOARD_SCHEMA_VERSION;
  readonly entityKind: ApolloEntityKind;
  readonly copiedAt: string;
  readonly entities: readonly (
    | ApolloPhase1Unit2Node
    | ApolloPhase1Unit2Member
    | ApolloPhase1Unit2Support
    | ApolloPhase1Unit2MaterialReference
  )[];
};

export type ApolloClipboardResult =
  | { readonly ok: true; readonly payload: ApolloClipboardPayload }
  | { readonly ok: false; readonly message: string };

export type ApolloPasteResult =
  | { readonly ok: true; readonly draft: ApolloPhase1Unit2Draft; readonly selectedRefs: readonly ApolloEntityRef[] }
  | { readonly ok: false; readonly message: string };

function cloneEntity<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function sameKind(refs: readonly ApolloEntityRef[]): ApolloEntityKind | null {
  const kind = refs[0]?.kind;
  if (!kind) return null;
  return refs.every((ref) => ref.kind === kind) ? kind : null;
}

function lookupEntity(
  draft: ApolloPhase1Unit2Draft,
  ref: ApolloEntityRef,
): ApolloClipboardEntityMap[ApolloEntityKind] | null {
  switch (ref.kind) {
    case "node":
      return draft.nodes.find((node) => node.id === ref.id) ?? null;
    case "member":
      return draft.members.find((member) => member.id === ref.id) ?? null;
    case "support":
      return draft.supports.find((support) => support.id === ref.id) ?? null;
    case "material":
      return draft.materialReferences.find((material) => material.id === ref.id) ?? null;
  }
}

export function buildApolloClipboardPayload(
  draft: ApolloPhase1Unit2Draft,
  refs: readonly ApolloEntityRef[],
  copiedAt: string,
): ApolloClipboardResult {
  if (refs.length === 0) {
    return { ok: false, message: "コピーする行を選択してください。" };
  }
  const kind = sameKind(refs);
  if (!kind) {
    return { ok: false, message: "異なる種類の行は同時にコピーできません。" };
  }
  const entities = refs.map((ref) => lookupEntity(draft, ref)).filter((value) => value !== null);
  if (entities.length !== refs.length) {
    return { ok: false, message: "コピー対象に存在しない行が含まれています。" };
  }
  return {
    ok: true,
    payload: {
      schemaVersion: APOLLO_CLIPBOARD_SCHEMA_VERSION,
      entityKind: kind,
      copiedAt,
      entities: entities.map((entity) => cloneEntity(entity)),
    },
  };
}

export function applyApolloClipboardPaste(
  draft: ApolloPhase1Unit2Draft,
  payload: ApolloClipboardPayload | null,
): ApolloPasteResult {
  if (!payload) {
    return { ok: false, message: "Apollo内部クリップボードが空です。" };
  }
  if (payload.schemaVersion !== APOLLO_CLIPBOARD_SCHEMA_VERSION) {
    return { ok: false, message: "未対応のApolloクリップボード形式です。" };
  }
  if (payload.entities.length === 0) {
    return { ok: false, message: "貼り付け対象がありません。" };
  }

  switch (payload.entityKind) {
    case "node": {
      const taken = draft.nodes.map((node) => node.id);
      const additions = payload.entities.map((entity) => {
        const nextId = nextApolloUnit2Id("APN-", taken);
        taken.push(nextId);
        return { ...(entity as ApolloPhase1Unit2Node), id: nextId };
      });
      return {
        ok: true,
        draft: { ...draft, nodes: [...draft.nodes, ...additions] },
        selectedRefs: additions.map((node) => ({ kind: "node" as const, id: node.id })),
      };
    }
    case "member": {
      const nodeIds = new Set(draft.nodes.map((node) => node.id));
      const materialIds = new Set(draft.materialReferences.map((material) => material.id));
      for (const entity of payload.entities as ApolloPhase1Unit2Member[]) {
        if (!nodeIds.has(entity.nodeI) || !nodeIds.has(entity.nodeJ) || !materialIds.has(entity.materialRefId)) {
          return { ok: false, message: "参照切れのある部材は貼り付けできません。" };
        }
      }
      const taken = draft.members.map((member) => member.id);
      const additions = (payload.entities as ApolloPhase1Unit2Member[]).map((entity) => {
        const nextId = nextApolloUnit2Id("APM-", taken);
        taken.push(nextId);
        return { ...entity, id: nextId };
      });
      return {
        ok: true,
        draft: { ...draft, members: [...draft.members, ...additions] },
        selectedRefs: additions.map((member) => ({ kind: "member" as const, id: member.id })),
      };
    }
    case "support": {
      const nodeIds = new Set(draft.nodes.map((node) => node.id));
      const occupiedNodeIds = new Set(draft.supports.map((support) => support.nodeId));
      for (const entity of payload.entities as ApolloPhase1Unit2Support[]) {
        if (!nodeIds.has(entity.nodeId)) {
          return { ok: false, message: "参照切れのある支点は貼り付けできません。" };
        }
        if (occupiedNodeIds.has(entity.nodeId)) {
          return { ok: false, message: `節点 ${entity.nodeId} には既に支点があります。` };
        }
        occupiedNodeIds.add(entity.nodeId);
      }
      const taken = draft.supports.map((support) => support.id);
      const additions = (payload.entities as ApolloPhase1Unit2Support[]).map((entity) => {
        const nextId = nextApolloUnit2Id("SUP-", taken);
        taken.push(nextId);
        return { ...entity, id: nextId };
      });
      return {
        ok: true,
        draft: { ...draft, supports: [...draft.supports, ...additions] },
        selectedRefs: additions.map((support) => ({ kind: "support" as const, id: support.id })),
      };
    }
    case "material": {
      const taken = draft.materialReferences.map((material) => material.id);
      const additions = (payload.entities as ApolloPhase1Unit2MaterialReference[]).map((entity) => {
        const nextId = nextApolloUnit2Id("MAT-", taken);
        taken.push(nextId);
        return { ...entity, id: nextId };
      });
      return {
        ok: true,
        draft: { ...draft, materialReferences: [...draft.materialReferences, ...additions] },
        selectedRefs: additions.map((material) => ({ kind: "material" as const, id: material.id })),
      };
    }
  }
}
