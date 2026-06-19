import type { AnalysisSettings, ProjectModel } from "../types";

export type TimeHistoryAxis = "x" | "y" | "z";
export type TimeHistoryV2Settings = NonNullable<AnalysisSettings["timeHistory"]> & {
  schemaVersion: 2;
  groundMotions: Record<TimeHistoryAxis, { enabled: boolean; groundMotionId: string | null }>;
};

export function migrateTimeHistorySettings(project: ProjectModel): ProjectModel {
  const settings = project.analysisSettings.timeHistory;
  if (!settings) return project;
  if (settings.schemaVersion === 2 && settings.groundMotions) return project;
  const fallbackMotion = project.groundMotions?.find((motion) => motion.id === settings.groundMotionId)
    ?? project.groundMotions?.[0];
  const direction = (settings.direction ?? fallbackMotion?.direction ?? "X").toLowerCase() as TimeHistoryAxis;
  const groundMotionId = settings.groundMotionId ?? fallbackMotion?.id ?? null;
  const groundMotions = Object.fromEntries(
    (["x", "y", "z"] as TimeHistoryAxis[]).map((axis) => [
      axis,
      { enabled: axis === direction && groundMotionId !== null, groundMotionId: axis === direction ? groundMotionId : null },
    ]),
  ) as TimeHistoryV2Settings["groundMotions"];
  return {
    ...project,
    analysisSettings: {
      ...project.analysisSettings,
      timeHistory: { ...settings, schemaVersion: 2, groundMotions },
    },
  };
}

export function enabledGroundMotions(project: ProjectModel) {
  const migrated = migrateTimeHistorySettings(project);
  const settings = migrated.analysisSettings.timeHistory as TimeHistoryV2Settings | undefined;
  return (["x", "y", "z"] as TimeHistoryAxis[]).flatMap((axis) => {
    const assignment = settings?.groundMotions[axis];
    const motion = migrated.groundMotions?.find((item) => item.id === assignment?.groundMotionId);
    return assignment?.enabled && motion ? [{ axis, motion }] : [];
  });
}
