/** Step 4-B presence semantics (DEC-S4-0004). Empty array ≠ EXPLICIT_NONE. */

export const PRESENCE_STATUS = {
  NOT_PROVIDED: "NOT_PROVIDED",
  EXPLICIT_NONE: "EXPLICIT_NONE",
  PROVIDED: "PROVIDED",
} as const;

export type PresenceStatus = (typeof PRESENCE_STATUS)[keyof typeof PRESENCE_STATUS];

export const PRESENCE_STATUS_VALUES: readonly PresenceStatus[] = [
  PRESENCE_STATUS.NOT_PROVIDED,
  PRESENCE_STATUS.EXPLICIT_NONE,
  PRESENCE_STATUS.PROVIDED,
] as const;

export function isPresenceStatus(value: unknown): value is PresenceStatus {
  return (
    value === PRESENCE_STATUS.NOT_PROVIDED ||
    value === PRESENCE_STATUS.EXPLICIT_NONE ||
    value === PRESENCE_STATUS.PROVIDED
  );
}

export type PresenceDiagnosticCode =
  | "PRESENCE_PROVIDED_WITHOUT_ITEM"
  | "PRESENCE_EXPLICIT_NONE_WITH_ITEM"
  | "PRESENCE_NOT_PROVIDED_WITH_ITEM";

export type PresenceConsistencyResult = {
  readonly ok: boolean;
  readonly code: PresenceDiagnosticCode | null;
  readonly message: string | null;
};

/**
 * PROVIDED requires a present item; EXPLICIT_NONE and NOT_PROVIDED require no item.
 * Callers supply hasItem based on whether a canonical item payload exists.
 */
export function validatePresenceConsistency(
  presence: PresenceStatus,
  hasItem: boolean,
  label: string,
): PresenceConsistencyResult {
  if (presence === PRESENCE_STATUS.PROVIDED && !hasItem) {
    return {
      ok: false,
      code: "PRESENCE_PROVIDED_WITHOUT_ITEM",
      message: `${label}: 「あり」が選択されていますが項目がありません。寸法を入力するか「なし／未入力」に戻してください。`,
    };
  }
  if (presence === PRESENCE_STATUS.EXPLICIT_NONE && hasItem) {
    return {
      ok: false,
      code: "PRESENCE_EXPLICIT_NONE_WITH_ITEM",
      message: `${label}: 「なし」が選択されていますが項目が残っています。項目を削除するか「あり」に変更してください。`,
    };
  }
  if (presence === PRESENCE_STATUS.NOT_PROVIDED && hasItem) {
    return {
      ok: false,
      code: "PRESENCE_NOT_PROVIDED_WITH_ITEM",
      message: `${label}: 「未入力」なのに項目があります。状態を「あり／なし」へ更新してください。`,
    };
  }
  return { ok: true, code: null, message: null };
}
