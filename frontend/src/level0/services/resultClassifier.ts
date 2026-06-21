export function classify(maxDisplacementCm: number, displayReferenceCm: number): "small" | "medium" | "large" {
  if (displayReferenceCm <= 0) return "small";
  const ratio = maxDisplacementCm / displayReferenceCm;
  if (ratio < 0.3) return "small";
  if (ratio < 0.7) return "medium";
  return "large";
}
