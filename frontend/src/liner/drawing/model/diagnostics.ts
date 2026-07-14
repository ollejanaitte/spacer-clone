export type DrawingDiagnostic = {
  severity: "info" | "warning" | "error";
  code: string;
  message: string;
  source?: string;
  sheetId?: string;
  viewportId?: string;
};

export function createDrawingDiagnostic(
  severity: DrawingDiagnostic["severity"],
  code: string,
  message: string,
  extra: Omit<DrawingDiagnostic, "severity" | "code" | "message"> = {},
): DrawingDiagnostic {
  return {
    severity,
    code,
    message,
    ...extra,
  };
}

export function hasDrawingDiagnosticsError(diagnostics: readonly DrawingDiagnostic[]): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === "error");
}
