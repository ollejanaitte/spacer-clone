export type DxfDiagnosticSeverity = "info" | "warning" | "error";

export type DxfDiagnostic = {
  severity: DxfDiagnosticSeverity;
  code: string;
  message: string;
  source?: string;
  entityId?: string;
  layerName?: string;
};

export function createDxfDiagnostic(
  severity: DxfDiagnosticSeverity,
  code: string,
  message: string,
  extra: Omit<DxfDiagnostic, "severity" | "code" | "message"> = {},
): DxfDiagnostic {
  return {
    severity,
    code,
    message,
    ...extra,
  };
}

export function hasDxfDiagnosticsError(diagnostics: readonly DxfDiagnostic[]): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === "error");
}
