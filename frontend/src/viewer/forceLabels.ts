/** Format a finite force value for compact 3D labels. */
export function formatForceLabel(component: string, value: number): string {
  if (!Number.isFinite(value)) return `${component}=--`;
  const normalized = Math.abs(value) < 1e-12 ? 0 : value;
  const magnitude = Math.abs(normalized);
  const text = magnitude >= 1e5 || (magnitude > 0 && magnitude < 1e-3)
    ? normalized.toExponential(3)
    : normalized.toFixed(3).replace(/\.?0+$/, "");
  return `${component}=${text}`;
}

/** Join enabled reaction components into one stable, signed label. */
export function buildReactionLabel(
  reaction: { fx: number; fy: number; fz: number },
  enabled: { fx: boolean; fy: boolean; fz: boolean },
): string {
  return ([
    enabled.fx ? formatForceLabel("RFX", reaction.fx) : null,
    enabled.fy ? formatForceLabel("RFY", reaction.fy) : null,
    enabled.fz ? formatForceLabel("RFZ", reaction.fz) : null,
  ]).filter((item): item is string => item !== null).join("  ");
}
