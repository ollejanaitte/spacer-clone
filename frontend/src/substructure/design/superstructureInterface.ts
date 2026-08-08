// Phase C1 (M3-02) 上部工 support-interface アダプタ（純粋ロジック）
// schemas/substructure/support-interface.schema.json v0.1.0 の JSON を
// 下部工側の型（BearingSeat / ReactionCaseData）へ変換する。fail-closed。

import type { BearingSeat, BearingType, Vec3 } from "../model";
import type {
  BearingSeatInput,
  ReactionCaseData,
  SuperstructureInput,
  SupportReactions,
} from "../design/designTypes";

export const SUPPORT_INTERFACE_SCHEMA_VERSION = "0.1.0";

export interface ParseResult<T> {
  ok: boolean;
  value: T | null;
  diagnostics: string[];
}

export interface SupportInterfaceDoc {
  schemaVersion: string;
  projectId?: string;
  bridgeId?: string;
  supportId: string;
  supportType?: "pier" | "abutment";
  sourceApplication?: string;
  sourceVersion?: string;
  sourceRevision?: string;
  bearingSeats?: BearingSeatInput[];
  reactionCases?: ReactionCaseData[];
  girderBottomElevation?: number;
  deckElevation?: number;
}

function isNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isVec3(v: unknown): v is Vec3 {
  return (
    !!v &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    isNumber((v as Vec3).x) &&
    isNumber((v as Vec3).y) &&
    isNumber((v as Vec3).z)
  );
}

function mapBearingType(_raw?: string): BearingType {
  // support-interface v0.1.0 は bearingType を持たない。既定 elastomeric。
  return "elastomeric";
}

/** support-interface JSON → SupportInterfaceDoc（fail-closed）。 */
export function parseSupportInterface(jsonText: string): ParseResult<SupportInterfaceDoc> {
  const diagnostics: string[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    return {
      ok: false,
      value: null,
      diagnostics: [`JSON として解釈できません: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, value: null, diagnostics: ["support-interface はオブジェクトが必要"] };
  }
  const doc = parsed as Record<string, unknown>;
  if (doc.schemaVersion !== SUPPORT_INTERFACE_SCHEMA_VERSION) {
    diagnostics.push(
      `schemaVersion=${String(doc.schemaVersion)} は非対応（期待 ${SUPPORT_INTERFACE_SCHEMA_VERSION}）`,
    );
  }
  if (typeof doc.supportId !== "string" || doc.supportId.length === 0) {
    diagnostics.push("supportId は必須（非空文字列）");
  }
  if (doc.supportType !== undefined && doc.supportType !== "pier" && doc.supportType !== "abutment") {
    diagnostics.push(`supportType=${String(doc.supportType)} は pier/abutment のみ対応`);
  }
  if (doc.bearingSeats !== undefined && !Array.isArray(doc.bearingSeats)) {
    diagnostics.push("bearingSeats は配列が必要");
  }
  if (doc.reactionCases !== undefined && !Array.isArray(doc.reactionCases)) {
    diagnostics.push("reactionCases は配列が必要");
  }
  if (diagnostics.length > 0) {
    return { ok: false, value: null, diagnostics };
  }
  return {
    ok: true,
    value: parsed as SupportInterfaceDoc,
    diagnostics,
  };
}

/** SupportInterfaceDoc の bearingSeats → モデル BearingSeat[]。 */
export function bearingSeatsToModel(
  supportId: string,
  seats: readonly BearingSeatInput[] | undefined,
): BearingSeat[] {
  if (!seats) return [];
  return seats
    .filter((s) => s && typeof s.bearingId === "string" && isVec3(s.bearingPosition))
    .map((s, i) => {
      const dims = s.bearingDimensions ?? { w: 0.4, d: 0.4, h: 0.1 };
      return {
        seatId: `${supportId}-SEAT-${String(i + 1).padStart(2, "0")}`,
        position: { ...s.bearingPosition },
        dimensions: {
          w: dims.w ?? 0.4,
          d: dims.d ?? 0.4,
          h: dims.h ?? 0.1,
        },
        bearing: {
          id: s.bearingId,
          height: s.bearingHeight ?? dims.h ?? 0.1,
          type: mapBearingType(),
        },
      };
    });
}

/** SupportInterfaceDoc → SupportReactions（入力データとして保持）。 */
export function interfaceToReactions(doc: SupportInterfaceDoc): SupportReactions {
  return {
    supportId: doc.supportId,
    cases: doc.reactionCases ?? [],
    source: doc.sourceApplication,
    sourceRevision: doc.sourceRevision,
  };
}

/** SuperstructureInput の整合チェック（supportId 一致、bearing/reaction 型）。 */
export function validateSuperstructureInput(
  input: SuperstructureInput,
): string[] {
  const diagnostics: string[] = [];
  if (!input.supportId || input.supportId.trim() === "") {
    diagnostics.push("supportId は必須");
  }
  if (input.bearingSeats && !Array.isArray(input.bearingSeats)) {
    diagnostics.push("bearingSeats は配列が必要");
  }
  if (input.reactionCases && !Array.isArray(input.reactionCases)) {
    diagnostics.push("reactionCases は配列が必要");
  }
  if (input.bearingSeats) {
    for (const seat of input.bearingSeats) {
      if (!seat || typeof seat.bearingId !== "string" || !isVec3(seat.bearingPosition)) {
        diagnostics.push("bearingSeat には bearingId と position(x,y,z) が必要");
      }
    }
  }
  if (input.reactionCases) {
    for (const c of input.reactionCases) {
      if (!c || typeof c.caseId !== "string" || typeof c.caseKind !== "string") {
        diagnostics.push("reactionCase には caseId と caseKind が必要");
      }
      if (c && c.force !== undefined && !isVec3(c.force)) {
        diagnostics.push(`reactionCase ${c.caseId} の force は x/y/z が必要`);
      }
    }
  }
  return diagnostics;
}
