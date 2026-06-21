/**
 * 解析結果を「small」「medium」「large」の3段階に分類する。
 *
 * 境界条件（設計書 §9.2）:
 * - r < 0.3: small
 * - 0.3 <= r < 0.7: medium
 * - r >= 0.7: large
 *
 * @param maxDisplacementCm - 最大変位 (cm)
 * @param displayReferenceCm - 表示基準値 (cm)
 * @returns "small" | "medium" | "large"
 */
export function classify(
  maxDisplacementCm: number,
  displayReferenceCm: number,
): "small" | "medium" | "large" {
  if (displayReferenceCm <= 0) return "small";
  const ratio = maxDisplacementCm / displayReferenceCm;
  if (ratio < 0.3) return "small";
  if (ratio < 0.7) return "medium";
  return "large";
}
