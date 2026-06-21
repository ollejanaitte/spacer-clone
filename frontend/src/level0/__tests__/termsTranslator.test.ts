import { describe, test, expect } from "vitest";
import { translateTerm, translateTerms, getTechnicalTerms } from "../services/termsTranslator";

describe("termsTranslator", () => {
  test("translateTerm: 翻訳対象の用語を変換する", () => {
    expect(translateTerm("節点")).toBe("つなぎ目");
    expect(translateTerm("部材")).toBe("棒");
    expect(translateTerm("支点")).toBe("地面との接点");
    expect(translateTerm("固有値")).toBe("ゆれやすさ");
    expect(translateTerm("時刻歴応答解析")).toBe("地震シミュレーション");
  });

  test("translateTerm: 翻訳対象外の用語はそのまま返す", () => {
    expect(translateTerm("橋")).toBe("橋");
    expect(translateTerm("unknown")).toBe("unknown");
  });

  test("translateTerms: テキスト内の全用語を翻訳する", () => {
    const result = translateTerms("節点の変位を確認");
    expect(result).toContain("つなぎ目");
    expect(result).toContain("ゆれの大きさ");
  });

  test("getTechnicalTerms: 専門用語一覧を返す", () => {
    const terms = getTechnicalTerms();
    expect(terms).toContain("節点");
    expect(terms).toContain("部材");
    expect(terms.length).toBeGreaterThan(0);
  });
});
