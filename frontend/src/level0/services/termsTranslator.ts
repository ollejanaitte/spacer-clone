import { TERMS_DATA } from "../data/termsData";

type TermMap = Record<string, string>;

const level0Terms: TermMap = TERMS_DATA.level0;

/**
 * 専門用語を初心者向けの表示に翻訳する。
 * 翻訳対象外の用語は元の文字列を返す。
 */
export function translateTerm(term: string): string {
  return level0Terms[term] ?? term;
}

/**
 * テキスト内の専門用語を全て初心者向けに翻訳する。
 */
export function translateTerms(text: string): string {
  let result = text;
  for (const [technical, beginner] of Object.entries(level0Terms)) {
    result = result.replaceAll(technical, beginner);
  }
  return result;
}

/**
 * 翻訳辞書に含まれる専門用語の一覧を返す。
 */
export function getTechnicalTerms(): string[] {
  return Object.keys(level0Terms);
}
