/** Convert UI grade percent to internal grade ratio (dZ/ds). */
export function gradePercentToRatio(gradePercent: number): number {
  return gradePercent / 100;
}

/** Convert internal grade ratio to UI percent display. */
export function gradeRatioToPercent(gradeRatio: number): number {
  return gradeRatio * 100;
}

/** Round grade percent to 3 decimal places for UI input. */
export function roundGradePercent(gradePercent: number): number {
  return Math.round(gradePercent * 1000) / 1000;
}

export function parseGradePercentInput(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return roundGradePercent(parsed);
}
