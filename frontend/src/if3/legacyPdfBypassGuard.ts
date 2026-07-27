const LEGACY_PDF_BYPASS_MESSAGE =
  "Legacy raw AnalysisResult PDF export is blocked. Use the IF3-gated buildIf3ResultPdfReport path only.";

export function denyLegacyOpenResultPdfReport(): never {
  throw new Error(LEGACY_PDF_BYPASS_MESSAGE);
}

export function legacyPdfBypassBlockedMessage(): string {
  return LEGACY_PDF_BYPASS_MESSAGE;
}
