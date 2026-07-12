import { useMemo, useState, type ChangeEvent } from "react";
import {
  compareSemanticParity,
  createParityReportEnvelope,
  serializeParityReportEnvelope,
  type ParityReport,
  type ParityReportEnvelope,
  type SemanticParityDiagnostic,
  type SemanticParitySeverity,
  type SemanticParityStatus,
} from "../bridgeDefinition";
import { ja } from "../i18n/ja";
import type { ProjectModel } from "../types";

type ProjectParseState =
  | {
      kind: "empty";
    }
  | {
      kind: "valid";
      fileName: string;
      project: ProjectModel;
    }
  | {
      kind: "invalid";
      fileName: string;
      error: string;
    };

const DEFAULT_RIGHT_LABEL = ja.resultsPanel.semanticParity.rightSourcePlaceholder;

const statusLabels: Record<SemanticParityStatus, string> = {
  equivalent: ja.resultsPanel.semanticParity.status.equivalent,
  different: ja.resultsPanel.semanticParity.status.different,
  indeterminate: ja.resultsPanel.semanticParity.status.indeterminate,
  invalid: ja.resultsPanel.semanticParity.status.invalid,
};

const statusDescriptionLabels: Record<SemanticParityStatus, string> = {
  equivalent: ja.resultsPanel.semanticParity.statusDescription.equivalent,
  different: ja.resultsPanel.semanticParity.statusDescription.different,
  indeterminate: ja.resultsPanel.semanticParity.statusDescription.indeterminate,
  invalid: ja.resultsPanel.semanticParity.statusDescription.invalid,
};

export function ResultsPanelSemanticParity({ project }: { project: ProjectModel }) {
  const [rightState, setRightState] = useState<ProjectParseState>({ kind: "empty" });
  const [compareBusy, setCompareBusy] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [reportEnvelope, setReportEnvelope] = useState<ParityReportEnvelope | null>(null);
  const [rightVersion, setRightVersion] = useState(0);
  const [comparedRightVersion, setComparedRightVersion] = useState<number | null>(null);

  const rightProject = rightState.kind === "valid" ? rightState.project : null;
  const rightFileName = rightState.kind === "empty" ? null : rightState.fileName;
  const rightValidationError = rightState.kind === "invalid" ? rightState.error : null;
  const report = reportEnvelope?.report ?? null;
  const { reportJson, reportSerializationError } = useMemo(() => {
    if (!reportEnvelope) {
      return { reportJson: "", reportSerializationError: null as string | null };
    }
    try {
      return {
        reportJson: serializeParityReportEnvelope(reportEnvelope, { pretty: true }),
        reportSerializationError: null,
      };
    } catch (error) {
      return {
        reportJson: "",
        reportSerializationError: error instanceof Error ? error.message : String(error),
      };
    }
  }, [reportEnvelope]);
  const reportIsStale = reportEnvelope !== null && comparedRightVersion !== rightVersion;
  const reportStatus = report?.status ?? null;
  const leftSourceLabel = useMemo(
    () => project.project.name.trim() || project.project.id || ja.resultsPanel.semanticParity.leftSourcePlaceholder,
    [project.project.id, project.project.name],
  );
  const rightSourceLabel = rightProject?.project.name.trim() || rightFileName || DEFAULT_RIGHT_LABEL;
  const reportSourceLabel = rightFileName || rightSourceLabel;
  const compareDisabled = compareBusy || rightProject === null;

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (!file) {
      setRightState({ kind: "empty" });
      setCompareError(null);
      setActionMessage(null);
      setRightVersion((current) => current + 1);
      return;
    }

    setCompareError(null);
    setActionMessage(null);

    try {
      const text = await file.text();
      const raw = JSON.parse(text) as unknown;
      const validation = validateProjectModelCandidate(raw);
      if (!validation.ok) {
        setRightState({
          kind: "invalid",
          fileName: file.name,
          error: validation.errors.join(" "),
        });
        setRightVersion((current) => current + 1);
        return;
      }
      setRightState({
        kind: "valid",
        fileName: file.name,
        project: validation.project,
      });
      setRightVersion((current) => current + 1);
    } catch (error) {
      setRightState({
        kind: "invalid",
        fileName: file.name,
        error: error instanceof Error ? error.message : String(error),
      });
      setRightVersion((current) => current + 1);
    }
  };

  const runComparison = () => {
    if (!rightProject) {
      setCompareError(ja.resultsPanel.semanticParity.validation.selectRightModel);
      return;
    }

    setCompareBusy(true);
    setCompareError(null);
    setActionMessage(null);

    try {
      const report = compareSemanticParity(project, rightProject, {
        leftLabel: leftSourceLabel,
        rightLabel: reportSourceLabel,
        leftSource: "generated",
        rightSource: "imported",
      });
      const envelope = createParityReportEnvelope(report, {
        schemaVersion: "1.0.0",
        sources: {
          left: {
            source: "generated",
            label: leftSourceLabel,
          },
          right: {
            source: "imported",
            label: reportSourceLabel,
          },
        },
      });
      setReportEnvelope(envelope);
      setComparedRightVersion(rightVersion);
      setActionMessage(ja.resultsPanel.semanticParity.messages.comparisonFinished(statusLabels[report.status]));
    } catch (error) {
      setCompareError(error instanceof Error ? error.message : String(error));
    } finally {
      setCompareBusy(false);
    }
  };

  const handleDownload = () => {
    if (!reportEnvelope || reportSerializationError) {
      return;
    }

    const fileName = buildReportFileName(project, rightFileName);
    const blob = new Blob([reportJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    setActionMessage(ja.resultsPanel.semanticParity.messages.downloaded(fileName));
  };

  const handleCopy = async () => {
    if (!reportEnvelope || reportSerializationError) {
      return;
    }

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error(ja.resultsPanel.semanticParity.messages.copyUnavailable);
      }
      await navigator.clipboard.writeText(reportJson);
      setActionMessage(ja.resultsPanel.semanticParity.messages.copied);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const handleClear = () => {
    setRightState({ kind: "empty" });
    setCompareError(null);
    setActionMessage(null);
    setReportEnvelope(null);
    setRightVersion((current) => current + 1);
    setComparedRightVersion(null);
  };

  const diagnostics = report ? collectDiagnostics(report) : [];

  return (
    <section className="semantic-parity-panel" aria-labelledby="semantic-parity-heading">
      <div className="semantic-parity-header">
        <div>
          <h3 id="semantic-parity-heading">{ja.resultsPanel.semanticParity.heading}</h3>
          <p>{ja.resultsPanel.semanticParity.description}</p>
        </div>
        <div className="semantic-parity-actions">
          <button type="button" onClick={runComparison} disabled={compareDisabled}>
            {compareBusy ? ja.resultsPanel.semanticParity.compareRunning : ja.resultsPanel.semanticParity.compare}
          </button>
          <button type="button" onClick={handleCopy} disabled={!reportEnvelope || reportSerializationError !== null}>
            {ja.resultsPanel.semanticParity.copy}
          </button>
          <button type="button" onClick={handleDownload} disabled={!reportEnvelope || reportSerializationError !== null}>
            {ja.resultsPanel.semanticParity.download}
          </button>
          <button type="button" onClick={handleClear}>
            {ja.resultsPanel.semanticParity.clear}
          </button>
        </div>
      </div>

      <div className="semantic-parity-grid">
        <section className="semantic-parity-card">
          <h4>{ja.resultsPanel.semanticParity.leftHeading}</h4>
          <p>{ja.resultsPanel.semanticParity.leftSourceLabel}: {leftSourceLabel}</p>
          <p>{ja.resultsPanel.semanticParity.leftSourceDescription}</p>
        </section>

        <section className="semantic-parity-card">
          <h4>{ja.resultsPanel.semanticParity.rightHeading}</h4>
          <p>{ja.resultsPanel.semanticParity.rightSourceLabel}: {rightSourceLabel}</p>
          <label className="semantic-parity-file">
            {ja.resultsPanel.semanticParity.fileInputLabel}
            <input
              type="file"
              accept="application/json,.json"
              onChange={(event) => {
                void handleFileChange(event);
              }}
            />
          </label>
          <p>{ja.resultsPanel.semanticParity.rightSourceDescription}</p>
        </section>
      </div>

      {rightState.kind === "invalid" && (
        <p className="semantic-parity-error" role="alert">
          {ja.resultsPanel.semanticParity.validation.invalidModel}: {rightValidationError}
        </p>
      )}

      {compareError && (
        <p className="semantic-parity-error" role="alert">
          {compareError}
        </p>
      )}

      {reportSerializationError && (
        <p className="semantic-parity-error" role="alert">
          {ja.resultsPanel.semanticParity.messages.serializationFailed}: {reportSerializationError}
        </p>
      )}

      {actionMessage && (
        <p className="semantic-parity-status-message" role="status" aria-live="polite">
          {actionMessage}
        </p>
      )}

      <div className="semantic-parity-status-row" role="status" aria-live="polite">
        <span className={`semantic-parity-status-badge ${reportStatus ?? "idle"}`}>
          {reportStatus ? statusLabels[reportStatus] : ja.resultsPanel.semanticParity.status.idle}
        </span>
        <span className="semantic-parity-status-text">
          {reportStatus ? statusDescriptionLabels[reportStatus] : ja.resultsPanel.semanticParity.statusDescription.idle}
        </span>
        {reportIsStale && <span className="semantic-parity-stale">{ja.resultsPanel.semanticParity.stale}</span>}
      </div>

      {report ? (
        <div className="semantic-parity-results">
          <section className="semantic-parity-card">
            <h4>{ja.resultsPanel.semanticParity.summaryHeading}</h4>
            <dl className="semantic-parity-summary">
              <SummaryItem label={ja.resultsPanel.semanticParity.summary.status} value={statusLabels[report.status]} />
              <SummaryItem label={ja.resultsPanel.semanticParity.summary.matchedNodes} value={String(report.summary.matchedNodes)} />
              <SummaryItem label={ja.resultsPanel.semanticParity.summary.matchedMembers} value={String(report.summary.matchedMembers)} />
              <SummaryItem label={ja.resultsPanel.semanticParity.summary.unmatchedLeft} value={String(report.summary.unmatchedLeft)} />
              <SummaryItem label={ja.resultsPanel.semanticParity.summary.unmatchedRight} value={String(report.summary.unmatchedRight)} />
              <SummaryItem label={ja.resultsPanel.semanticParity.summary.mismatchCount} value={String(report.summary.mismatchCount)} />
              <SummaryItem label={ja.resultsPanel.semanticParity.summary.ambiguityCount} value={String(report.summary.ambiguityCount)} />
              <SummaryItem label={ja.resultsPanel.semanticParity.summary.warningCount} value={String(report.summary.warningCount)} />
              <SummaryItem label={ja.resultsPanel.semanticParity.summary.errorCount} value={String(report.summary.errorCount)} />
              <SummaryItem label={ja.resultsPanel.semanticParity.summary.geometryEquivalent} value={booleanLabel(report.summary.geometryEquivalent)} />
              <SummaryItem label={ja.resultsPanel.semanticParity.summary.topologyEquivalent} value={booleanLabel(report.summary.topologyEquivalent)} />
              <SummaryItem label={ja.resultsPanel.semanticParity.summary.structurallyValid} value={booleanLabel(report.summary.structurallyValid)} />
              <SummaryItem label={ja.resultsPanel.semanticParity.summary.supportEquivalent} value={booleanLabel(report.summary.supportEquivalent)} />
              <SummaryItem label={ja.resultsPanel.semanticParity.summary.propertyEquivalent} value={booleanLabel(report.summary.propertyEquivalent)} />
              <SummaryItem label={ja.resultsPanel.semanticParity.summary.loadEquivalent} value={booleanLabel(report.summary.loadEquivalent)} />
            </dl>
          </section>

          <section className="semantic-parity-card">
            <h4>{ja.resultsPanel.semanticParity.diagnosticsHeading}</h4>
            {diagnostics.length === 0 ? (
              <p>{ja.resultsPanel.semanticParity.noDiagnostics}</p>
            ) : (
              <ul className="semantic-parity-diagnostics">
                {diagnostics.map((diagnostic) => (
                  <li key={diagnosticKey(diagnostic)}>
                    <span className={`semantic-parity-diagnostic-level ${diagnostic.severity}`}>{diagnostic.severity}</span>
                    <strong>{diagnostic.code}</strong>
                    <span>{diagnostic.path}</span>
                    <span>{diagnostic.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : (
        <p className="semantic-parity-empty">{ja.resultsPanel.semanticParity.noReport}</p>
      )}

      <section className="semantic-parity-card">
        <h4>{ja.resultsPanel.semanticParity.reportHeading}</h4>
        <textarea
          className="semantic-parity-json"
          readOnly
          value={reportJson}
          placeholder={ja.resultsPanel.semanticParity.noReport}
          aria-label={ja.resultsPanel.semanticParity.reportAriaLabel}
        />
      </section>
    </section>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

function booleanLabel(value: boolean | undefined): string {
  if (value === undefined) {
    return ja.common.notAvailable;
  }
  return value ? ja.common.yes : ja.common.no;
}

function buildReportFileName(project: ProjectModel, rightFileName: string | null): string {
  const left = sanitizeFileStem(project.project.id || project.project.name || "project");
  const right = sanitizeFileStem(rightFileName ? rightFileName.replace(/\.json$/i, "") : "parity");
  return `${left}-vs-${right}.parity-report.json`;
}

function sanitizeFileStem(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9._-]/g, "_")
    .replace(/^_+/, "")
    .replace(/_+$/, "") || "report";
}

function collectDiagnostics(report: ParityReport): SemanticParityDiagnostic[] {
  return [...report.errors, ...report.warnings].sort((left, right) => {
    if (left.severity !== right.severity) {
      return severityRank(left.severity) - severityRank(right.severity);
    }
    return `${left.code}:${left.path}:${left.message}`.localeCompare(`${right.code}:${right.path}:${right.message}`);
  });
}

function severityRank(severity: SemanticParitySeverity): number {
  switch (severity) {
    case "blocker":
      return 0;
    case "error":
      return 1;
    case "warning":
      return 2;
    case "info":
      return 3;
  }
}

function diagnosticKey(diagnostic: SemanticParityDiagnostic): string {
  return [diagnostic.severity, diagnostic.code, diagnostic.path, diagnostic.message, diagnostic.sourceId ?? ""].join("|");
}

function validateProjectModelCandidate(raw: unknown): { ok: true; project: ProjectModel } | { ok: false; errors: string[] } {
  if (!isRecord(raw)) {
    return { ok: false, errors: [ja.resultsPanel.semanticParity.validation.notAnObject] };
  }
  if (!isNumber(raw.schemaVersion)) {
    return { ok: false, errors: [ja.resultsPanel.semanticParity.validation.missingSchemaVersion] };
  }
  if (!isRecord(raw.project)) {
    return { ok: false, errors: [ja.resultsPanel.semanticParity.validation.missingProject] };
  }
  if (!isString(raw.project.id) || !isString(raw.project.name)) {
    return { ok: false, errors: [ja.resultsPanel.semanticParity.validation.invalidProjectFields] };
  }
  if (!isRecord(raw.units)) {
    return { ok: false, errors: [ja.resultsPanel.semanticParity.validation.missingUnits] };
  }

  const requiredArrays: Array<[string, string]> = [
    ["nodes", ja.resultsPanel.semanticParity.validation.missingNodes],
    ["materials", ja.resultsPanel.semanticParity.validation.missingMaterials],
    ["sections", ja.resultsPanel.semanticParity.validation.missingSections],
    ["members", ja.resultsPanel.semanticParity.validation.missingMembers],
    ["supports", ja.resultsPanel.semanticParity.validation.missingSupports],
    ["loadCases", ja.resultsPanel.semanticParity.validation.missingLoadCases],
    ["nodalLoads", ja.resultsPanel.semanticParity.validation.missingNodalLoads],
    ["memberLoads", ja.resultsPanel.semanticParity.validation.missingMemberLoads],
  ];

  for (const [key, message] of requiredArrays) {
    if (!Array.isArray(raw[key])) {
      return { ok: false, errors: [message] };
    }
  }

  const errors: string[] = [];
  const nodes = raw.nodes as unknown[];
  const materials = raw.materials as unknown[];
  const sections = raw.sections as unknown[];
  const members = raw.members as unknown[];
  const supports = raw.supports as unknown[];
  const loadCases = raw.loadCases as unknown[];
  const nodalLoads = raw.nodalLoads as unknown[];
  const memberLoads = raw.memberLoads as unknown[];

  const nodeIds = new Set<string>();
  const materialIds = new Set<string>();
  const sectionIds = new Set<string>();
  const memberIds = new Set<string>();
  const loadCaseIds = new Set<string>();

  if (!nodes.every(isNodeItem)) {
    errors.push(ja.resultsPanel.semanticParity.validation.invalidNodes);
  } else {
    for (const node of nodes) {
      if (nodeIds.has(node.id)) {
        errors.push(ja.resultsPanel.semanticParity.validation.duplicateNodeId(node.id));
      }
      nodeIds.add(node.id);
    }
  }

  if (!materials.every(isMaterialItem)) {
    errors.push(ja.resultsPanel.semanticParity.validation.invalidMaterials);
  } else {
    for (const material of materials) {
      if (materialIds.has(material.id)) {
        errors.push(ja.resultsPanel.semanticParity.validation.duplicateMaterialId(material.id));
      }
      materialIds.add(material.id);
    }
  }

  if (!sections.every(isSectionItem)) {
    errors.push(ja.resultsPanel.semanticParity.validation.invalidSections);
  } else {
    for (const section of sections) {
      if (sectionIds.has(section.id)) {
        errors.push(ja.resultsPanel.semanticParity.validation.duplicateSectionId(section.id));
      }
      sectionIds.add(section.id);
    }
  }

  if (!members.every(isMemberItem)) {
    errors.push(ja.resultsPanel.semanticParity.validation.invalidMembers);
  } else {
    for (const member of members) {
      if (memberIds.has(member.id)) {
        errors.push(ja.resultsPanel.semanticParity.validation.duplicateMemberId(member.id));
      }
      memberIds.add(member.id);
      if (!nodeIds.has(member.nodeI) || !nodeIds.has(member.nodeJ)) {
        errors.push(ja.resultsPanel.semanticParity.validation.memberNodeReference(member.id));
      }
      if (!materialIds.has(member.materialId) || !sectionIds.has(member.sectionId)) {
        errors.push(ja.resultsPanel.semanticParity.validation.memberPropertyReference(member.id));
      }
    }
  }

  if (!supports.every(isSupportItem)) {
    errors.push(ja.resultsPanel.semanticParity.validation.invalidSupports);
  } else {
    for (const support of supports) {
      if (!nodeIds.has(support.nodeId)) {
        errors.push(ja.resultsPanel.semanticParity.validation.supportReference(support.nodeId));
      }
    }
  }

  if (!loadCases.every(isLoadCaseItem)) {
    errors.push(ja.resultsPanel.semanticParity.validation.invalidLoadCases);
  } else {
    for (const loadCase of loadCases) {
      if (loadCaseIds.has(loadCase.id)) {
        errors.push(ja.resultsPanel.semanticParity.validation.duplicateLoadCaseId(loadCase.id));
      }
      loadCaseIds.add(loadCase.id);
    }
  }

  if (!nodalLoads.every(isNodalLoadItem)) {
    errors.push(ja.resultsPanel.semanticParity.validation.invalidNodalLoads);
  } else {
    for (const load of nodalLoads) {
      if (!nodeIds.has(load.nodeId) || !loadCaseIds.has(load.loadCaseId)) {
        errors.push(ja.resultsPanel.semanticParity.validation.nodalLoadReference(load.id));
      }
    }
  }

  if (!memberLoads.every(isMemberLoadItem)) {
    errors.push(ja.resultsPanel.semanticParity.validation.invalidMemberLoads);
  } else {
    for (const load of memberLoads) {
      if (!memberIds.has(load.memberId) || !loadCaseIds.has(load.loadCaseId)) {
        errors.push(ja.resultsPanel.semanticParity.validation.memberLoadReference(load.id));
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, project: raw as ProjectModel };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isVector3(value: unknown): value is { x: number; y: number; z: number } {
  return isRecord(value) && isNumber(value.x) && isNumber(value.y) && isNumber(value.z);
}

function isNodeItem(value: unknown): value is ProjectModel["nodes"][number] {
  return isRecord(value) && isString(value.id) && isNumber(value.x) && isNumber(value.y) && isNumber(value.z);
}

function isMaterialItem(value: unknown): value is ProjectModel["materials"][number] {
  return (
    isRecord(value)
    && isString(value.id)
    && isString(value.name)
    && isNumber(value.elasticModulus)
    && isNumber(value.shearModulus)
    && isNumber(value.poissonRatio)
    && isNumber(value.density)
  );
}

function isSectionItem(value: unknown): value is ProjectModel["sections"][number] {
  return (
    isRecord(value)
    && isString(value.id)
    && isString(value.name)
    && isNumber(value.area)
    && isNumber(value.iy)
    && isNumber(value.iz)
    && isNumber(value.j)
  );
}

function isMemberItem(value: unknown): value is ProjectModel["members"][number] {
  return isRecord(value)
    && isString(value.id)
    && isString(value.nodeI)
    && isString(value.nodeJ)
    && isString(value.materialId)
    && isString(value.sectionId)
    && (value.orientationVector === undefined || isVector3(value.orientationVector));
}

function isSupportItem(value: unknown): value is ProjectModel["supports"][number] {
  return (
    isRecord(value)
    && isString(value.nodeId)
    && isBoolean(value.ux)
    && isBoolean(value.uy)
    && isBoolean(value.uz)
    && isBoolean(value.rx)
    && isBoolean(value.ry)
    && isBoolean(value.rz)
  );
}

function isLoadCaseItem(value: unknown): value is ProjectModel["loadCases"][number] {
  return isRecord(value) && isString(value.id) && isString(value.name) && value.type === "static";
}

function isNodalLoadItem(value: unknown): value is ProjectModel["nodalLoads"][number] {
  return (
    isRecord(value)
    && isString(value.id)
    && isString(value.loadCaseId)
    && isString(value.nodeId)
    && isNumber(value.fx)
    && isNumber(value.fy)
    && isNumber(value.fz)
    && isNumber(value.mx)
    && isNumber(value.my)
    && isNumber(value.mz)
  );
}

function isMemberLoadItem(value: unknown): value is ProjectModel["memberLoads"][number] {
  return (
    isRecord(value)
    && isString(value.id)
    && isString(value.loadCaseId)
    && isString(value.memberId)
    && (value.coordinateSystem === "local" || value.coordinateSystem === "global")
    && value.type === "uniform"
    && isNumber(value.wx)
    && isNumber(value.wy)
    && isNumber(value.wz)
  );
}
