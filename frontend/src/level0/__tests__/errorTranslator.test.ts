import { describe, test, expect } from "vitest";
import { translateError, ERROR_DICTIONARY } from "../services/errorTranslator";

describe("errorTranslator", () => {
  test("translateError: SINGULAR_MATRIX → 初心者向け", () => {
    expect(translateError("SINGULAR_MATRIX")).toMatch(/計算ができませんでした/);
  });

  test("translateError: INSUFFICIENT_CONSTRAINTS → 初心者向け", () => {
    expect(translateError("INSUFFICIENT_CONSTRAINTS")).toMatch(/橋の支え方が足りません/);
  });

  test("translateError: TIME_HISTORY_DIVERGED → 初心者向け", () => {
    expect(translateError("TIME_HISTORY_DIVERGED")).toMatch(/ゆれが大きすぎて/);
  });

  test("translateError: WAVE_FILE_INVALID → 初心者向け", () => {
    expect(translateError("WAVE_FILE_INVALID")).toMatch(/地震データを読み込めませんでした/);
  });

  test("translateError: MASS_NOT_DEFINED → 初心者向け", () => {
    expect(translateError("MASS_NOT_DEFINED")).toMatch(/重さが設定されていません/);
  });

  test("translateError: 未知コードは UNKNOWN_ERROR にフォールバック", () => {
    expect(translateError("FOO_BAR")).toMatch(/予期しないエラー/);
  });

  test("ERROR_DICTIONARY: 全エラーコードが定義されている", () => {
    const expectedCodes = [
      "SINGULAR_MATRIX",
      "INSUFFICIENT_CONSTRAINTS",
      "TIME_HISTORY_DIVERGED",
      "WAVE_FILE_INVALID",
      "MASS_NOT_DEFINED",
      "UNKNOWN_ERROR",
    ];
    for (const code of expectedCodes) {
      expect(ERROR_DICTIONARY[code]).toBeTruthy();
    }
  });
});
