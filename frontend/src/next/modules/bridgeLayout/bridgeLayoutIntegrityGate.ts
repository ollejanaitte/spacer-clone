import type { ProjectManager } from "../../project/projectManager";
import type { BridgeLayoutDocument, BridgeLayoutIssue } from "./bridgeLayoutTypes";
import { validateBridgeLayoutDocument, parseBridgeLayoutDocument } from "./bridgeLayoutValidation";
import { validateBridgeRangeInput } from "./bridgeLayoutDomain";
import { validatePierConfiguration } from "./bridgeLayoutPiers";
import { validateSpanConfiguration, generateSpans } from "./bridgeLayoutSpans";
import { resolveBridgeLayoutReferences } from "./bridgeLayoutReferences";
import { buildSupportHandoff } from "./bridgeLayoutSupportHandoff";
import { buildSpanHandoff } from "./bridgeLayoutSpanHandoff";

/**
 * Phase 4-04 Reference Integrity / Final Validation Gate.
 *
 * Bridge Layout 全体の最終Integrityを一括検証する。
 * BridgeLayoutDocument が唯一正本であり、Handoffは derived として再生成・再検証される。
 */
export interface BridgeLayoutIntegrityResult {
  readonly ok: boolean;
  readonly issues: readonly BridgeLayoutIssue[];
  readonly checks: {
    readonly documentValid: boolean;
    readonly rangeValid: boolean;
    readonly pierConfigurationValid: boolean;
    readonly spanConfigurationValid: boolean;
    readonly referencesValid: boolean;
    readonly supportHandoffReady: boolean;
    readonly spanHandoffReady: boolean;
    readonly parserRoundTrip: boolean;
    readonly schemaVersion: string;
  };
  /** Phase 5上部工 readiness（Span Handoffが成立し、上部工へ進めるか） */
  readonly phase5Ready: boolean;
  /** Phase 6下部工 readiness（Support Handoffが成立し、下部工へ進めるか） */
  readonly phase6Ready: boolean;
}

/** Bridge Layout 全体の最終Integrity Gate を実行する。 */
export function runBridgeLayoutIntegrityGate(
  manager: ProjectManager,
  projectId: string,
  document: BridgeLayoutDocument,
): BridgeLayoutIntegrityResult {
  const issues: BridgeLayoutIssue[] = [];

  const documentValid = validateBridgeLayoutDocument(document).length === 0;
  if (!documentValid) issues.push(...validateBridgeLayoutDocument(document));

  const rangeIssues = validateBridgeRangeInput({
    startStation: document.bridgeRange.startStation,
    endStation: document.bridgeRange.endStation,
    alignmentTotalLength: null,
    roadReferenceValid: true,
    alignmentReferenceValid: true,
  });
  // validateBridgeRangeInput requires alignment length; the alignment-aware check happens via references.
  const rangeValid = documentValid && document.bridgeRange.startStation < document.bridgeRange.endStation;
  if (!rangeValid) issues.push(...rangeIssues.filter((i) => !i.message.includes("roadReference") && !i.message.includes("alignmentReference")));

  const pierConfigurationValid = validatePierConfiguration({ document }).length === 0;
  if (!pierConfigurationValid) issues.push(...validatePierConfiguration({ document }));

  const spanConfigurationValid = validateSpanConfiguration({ document: { ...document, spans: generateSpans(document) } }).length === 0;
  if (!spanConfigurationValid) issues.push(...validateSpanConfiguration({ document: { ...document, spans: generateSpans(document) } }));

  const references = resolveBridgeLayoutReferences(manager, projectId, document);
  const referencesValid = references.ok;
  if (!referencesValid) issues.push(...references.issues);

  const supportHandoff = buildSupportHandoff(manager, projectId, document);
  const supportHandoffReady = supportHandoff.ok;
  if (!supportHandoffReady && supportHandoff.ok === false) issues.push(...supportHandoff.issues);

  const spanHandoff = buildSpanHandoff(manager, projectId, document);
  const spanHandoffReady = spanHandoff.ok;
  if (!spanHandoffReady && spanHandoff.ok === false) issues.push(...spanHandoff.issues);

  const parsed = parseBridgeLayoutDocument(JSON.parse(JSON.stringify(document)));
  const parserRoundTrip = parsed.ok;
  if (!parserRoundTrip && parsed.ok === false) issues.push(...parsed.issues);

  // BridgeLayoutDocumentのabutment stationとbridgeRangeの整合
  if (!(Math.abs(document.abutments.A1.station - document.bridgeRange.startStation) < 1e-6
    && Math.abs(document.abutments.A2.station - document.bridgeRange.endStation) < 1e-6)) {
    issues.push({ path: "bridgeLayoutDocument", message: "abutment stations must match bridgeRange start/end" });
  }

  const ok = issues.length === 0;
  // Phase 5（上部工）: Span Handoffが正式入口。Support Handoffは共通Support配置情報として同時に参照する。
  const phase5Ready = spanHandoffReady && supportHandoffReady;
  // Phase 6（下部工）: Support Handoffが正式入口（上部工成果はPhase 5から別途Handoffされる）。
  const phase6Ready = supportHandoffReady;

  return {
    ok,
    issues,
    checks: {
      documentValid,
      rangeValid,
      pierConfigurationValid,
      spanConfigurationValid,
      referencesValid,
      supportHandoffReady,
      spanHandoffReady,
      parserRoundTrip,
      schemaVersion: document.schemaVersion,
    },
    phase5Ready,
    phase6Ready,
  };
}
