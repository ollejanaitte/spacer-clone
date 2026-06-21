// 設計書 §12.1 のエラー翻訳辞書。public/locales/error_dictionary.json と同期済み。
export const ERROR_DICTIONARY: Record<string, string> = {
  SINGULAR_MATRIX: "計算ができませんでした",
  INSUFFICIENT_CONSTRAINTS: "橋の支え方が足りません",
  TIME_HISTORY_DIVERGED: "ゆれが大きすぎて計算を続けられませんでした",
  WAVE_FILE_INVALID: "地震データを読み込めませんでした",
  MASS_NOT_DEFINED: "ゆれを計算するための重さが設定されていません",
  UNKNOWN_ERROR: "予期しないエラーが発生しました（プロモードで詳細を確認してください）",
};

/**
 * 解析エラーコードを初心者向けの表示メッセージに翻訳する。
 * 未知のコードは UNKNOWN_ERROR にフォールバックする。
 */
export function translateError(errorCode: string): string {
  return ERROR_DICTIONARY[errorCode] ?? ERROR_DICTIONARY.UNKNOWN_ERROR;
}
