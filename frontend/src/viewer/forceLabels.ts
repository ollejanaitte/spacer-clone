export type ForceLabelUnit = "kN" | "kN·m";

/** Format a finite force or moment value for compact 3D labels. */
export function formatForceLabel(component: string, value: number, unit: ForceLabelUnit = "kN"): string {
  if (!Number.isFinite(value)) return `${component}=-- ${unit}`;
  const normalized = Math.abs(value) < 1e-12 ? 0 : value;
  const magnitude = Math.abs(normalized);
  const text = magnitude >= 1e5 || (magnitude > 0 && magnitude < 1e-3)
    ? normalized.toExponential(3)
    : normalized.toFixed(3).replace(/\.?0+$/, "");
  return `${component}=${text} ${unit}`;
}

/** Join enabled reaction components into one stable, signed label. */
export function buildReactionLabel(
  reaction: { fx: number; fy: number; fz: number; mx: number; my: number; mz: number },
  enabled: { fx: boolean; fy: boolean; fz: boolean; mx: boolean; my: boolean; mz: boolean },
): string {
  return ([
    enabled.fx ? formatForceLabel("RFX", reaction.fx, "kN") : null,
    enabled.fy ? formatForceLabel("RFY", reaction.fy, "kN") : null,
    enabled.fz ? formatForceLabel("RFZ", reaction.fz, "kN") : null,
    enabled.mx ? formatForceLabel("RMX", reaction.mx, "kN·m") : null,
    enabled.my ? formatForceLabel("RMY", reaction.my, "kN·m") : null,
    enabled.mz ? formatForceLabel("RMZ", reaction.mz, "kN·m") : null,
  ]).filter((item): item is string => item !== null).join("  ");
}
