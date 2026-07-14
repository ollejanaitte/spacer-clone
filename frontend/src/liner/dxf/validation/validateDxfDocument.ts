import { createDxfDiagnostic, type DxfDiagnostic } from "../model/diagnostics";
import {
  DEFAULT_DXF_HEADER,
  DEFAULT_DXF_LAYER_0,
  DEFAULT_DXF_LINETYPE_CONTINUOUS,
  DEFAULT_DXF_TEXT_STYLE,
} from "../model/defaults";
import type { DxfDocument, DxfEntity, DxfLayer, DxfTables } from "../model/types";
import { SUPPORTED_ACAD_VERSIONS, SUPPORTED_DWG_CODEPAGES } from "../model/types";
import { isDxfUnits } from "../model/units";
import { isFiniteDxfNumber } from "../serializer/formatNumber";

export type ValidateDxfDocumentResult = {
  diagnostics: DxfDiagnostic[];
  hasErrors: boolean;
  normalizedTables: DxfTables;
};

const ENTITY_KIND_ORDER: Record<DxfEntity["kind"], number> = {
  arc: 0,
  circle: 1,
  line: 2,
  lwpolyline: 3,
  text: 4,
  mtext: 5,
};

export function validateDxfDocument(document: DxfDocument): ValidateDxfDocumentResult {
  const diagnostics: DxfDiagnostic[] = [...document.diagnostics];

  if (!SUPPORTED_ACAD_VERSIONS.includes(document.header.acadVer)) {
    diagnostics.push(
      createDxfDiagnostic(
        "error",
        "DXF_INVALID_ACADVER",
        `Unsupported ACADVER: ${document.header.acadVer}`,
      ),
    );
  }

  if (!SUPPORTED_DWG_CODEPAGES.includes(document.header.dwgCodepage)) {
    diagnostics.push(
      createDxfDiagnostic(
        "error",
        "DXF_INVALID_CODEPAGE",
        `Unsupported DWGCODEPAGE: ${document.header.dwgCodepage}`,
      ),
    );
  }

  if (!isDxfUnits(document.header.units)) {
    diagnostics.push(
      createDxfDiagnostic("error", "DXF_INVALID_UNITS", `Unsupported units: ${document.header.units}`),
    );
  }

  const normalizedLayers = normalizeLayers(document.tables.layers, diagnostics);
  const normalizedLinetypes = normalizeLinetypes(document.tables.linetypes, diagnostics);
  const normalizedTextStyles = normalizeTextStyles(document.tables.textStyles, diagnostics);

  for (const entity of document.entities) {
    validateEntityNumbers(entity, diagnostics);
  }

  return {
    diagnostics,
    hasErrors: diagnostics.some((diagnostic) => diagnostic.severity === "error"),
    normalizedTables: {
      layers: normalizedLayers,
      linetypes: normalizedLinetypes,
      textStyles: normalizedTextStyles,
    },
  };
}

function normalizeLayers(layers: readonly DxfLayer[], diagnostics: DxfDiagnostic[]): DxfLayer[] {
  const byName = new Map<string, DxfLayer>();
  for (const layer of layers) {
    const name = sanitizeLayerName(layer.name);
    if (!name) {
      diagnostics.push(
        createDxfDiagnostic("warning", "DXF_INVALID_LAYER", `Skipped invalid layer name: ${layer.name}`),
      );
      continue;
    }
    if (byName.has(name)) {
      diagnostics.push(
        createDxfDiagnostic(
          "warning",
          "DXF_DUPLICATE_LAYER",
          `Duplicate layer normalized: ${name}`,
          { layerName: name },
        ),
      );
      continue;
    }
    byName.set(name, {
      ...layer,
      name,
      lineType: layer.lineType || DEFAULT_DXF_LAYER_0.lineType,
    });
  }

  if (!byName.has(DEFAULT_DXF_LAYER_0.name)) {
    byName.set(DEFAULT_DXF_LAYER_0.name, { ...DEFAULT_DXF_LAYER_0 });
  }

  return [...byName.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function normalizeLinetypes(
  linetypes: readonly DxfDocument["tables"]["linetypes"][number][],
  diagnostics: DxfDiagnostic[],
): DxfDocument["tables"]["linetypes"] {
  const byName = new Map<string, DxfDocument["tables"]["linetypes"][number]>();
  for (const linetype of linetypes) {
    if (!linetype.name) {
      diagnostics.push(
        createDxfDiagnostic("warning", "DXF_INVALID_LINETYPE", "Skipped linetype with empty name"),
      );
      continue;
    }
    if (byName.has(linetype.name)) {
      diagnostics.push(
        createDxfDiagnostic(
          "warning",
          "DXF_DUPLICATE_LINETYPE",
          `Duplicate linetype normalized: ${linetype.name}`,
        ),
      );
      continue;
    }
    byName.set(linetype.name, linetype);
  }

  if (!byName.has(DEFAULT_DXF_LINETYPE_CONTINUOUS.name)) {
    byName.set(DEFAULT_DXF_LINETYPE_CONTINUOUS.name, { ...DEFAULT_DXF_LINETYPE_CONTINUOUS });
  }

  return [...byName.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function normalizeTextStyles(
  textStyles: readonly DxfDocument["tables"]["textStyles"][number][],
  diagnostics: DxfDiagnostic[],
): DxfDocument["tables"]["textStyles"] {
  const byName = new Map<string, DxfDocument["tables"]["textStyles"][number]>();
  for (const style of textStyles) {
    if (!style.name) {
      diagnostics.push(
        createDxfDiagnostic("warning", "DXF_INVALID_TEXT_STYLE", "Skipped text style with empty name"),
      );
      continue;
    }
    if (byName.has(style.name)) {
      diagnostics.push(
        createDxfDiagnostic(
          "warning",
          "DXF_DUPLICATE_TEXT_STYLE",
          `Duplicate text style normalized: ${style.name}`,
        ),
      );
      continue;
    }
    byName.set(style.name, style);
  }

  if (!byName.has(DEFAULT_DXF_TEXT_STYLE.name)) {
    byName.set(DEFAULT_DXF_TEXT_STYLE.name, { ...DEFAULT_DXF_TEXT_STYLE });
  }

  return [...byName.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function sanitizeLayerName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed;
}

function validateEntityNumbers(entity: DxfEntity, diagnostics: DxfDiagnostic[]): void {
  const report = (field: string, value: number) => {
    if (!isFiniteDxfNumber(value)) {
      diagnostics.push(
        createDxfDiagnostic(
          "error",
          "DXF_NON_FINITE_VALUE",
          `Entity ${entity.kind} has non-finite ${field}: ${String(value)}`,
        ),
      );
    }
  };

  switch (entity.kind) {
    case "line":
      report("start.x", entity.start.x);
      report("start.y", entity.start.y);
      report("end.x", entity.end.x);
      report("end.y", entity.end.y);
      return;
    case "lwpolyline":
      entity.vertices.forEach((vertex, index) => {
        report(`vertices[${index}].x`, vertex.x);
        report(`vertices[${index}].y`, vertex.y);
      });
      return;
    case "arc":
      report("center.x", entity.center.x);
      report("center.y", entity.center.y);
      report("radius", entity.radius);
      if (isFiniteDxfNumber(entity.radius) && entity.radius <= 0) {
        diagnostics.push(
          createDxfDiagnostic(
            "error",
            "DXF_INVALID_ARC_RADIUS",
            `Entity arc has non-positive radius: ${String(entity.radius)}`,
          ),
        );
      }
      report("startAngleDeg", entity.startAngleDeg);
      report("endAngleDeg", entity.endAngleDeg);
      return;
    case "circle":
      report("center.x", entity.center.x);
      report("center.y", entity.center.y);
      report("radius", entity.radius);
      if (isFiniteDxfNumber(entity.radius) && entity.radius <= 0) {
        diagnostics.push(
          createDxfDiagnostic(
            "error",
            "DXF_INVALID_CIRCLE_RADIUS",
            `Entity circle has non-positive radius: ${String(entity.radius)}`,
          ),
        );
      }
      return;
    case "text":
      report("position.x", entity.position.x);
      report("position.y", entity.position.y);
      report("height", entity.height);
      if (entity.rotationDeg !== undefined) {
        report("rotationDeg", entity.rotationDeg);
      }
      return;
    case "mtext":
      diagnostics.push(
        createDxfDiagnostic(
          "warning",
          "DXF_MTEXT_UNSUPPORTED",
          "MTEXT entities are not serialized in Step3 PR1; entity omitted from output",
          { layerName: entity.layer },
        ),
      );
      report("position.x", entity.position.x);
      report("position.y", entity.position.y);
      report("height", entity.height);
      if (entity.rotationDeg !== undefined) {
        report("rotationDeg", entity.rotationDeg);
      }
      return;
    default: {
      const exhaustive: never = entity;
      return exhaustive;
    }
  }
}

export function sortDxfEntities(entities: readonly DxfEntity[]): DxfEntity[] {
  return [...entities].sort((left, right) => {
    const layerCompare = left.layer.localeCompare(right.layer);
    if (layerCompare !== 0) {
      return layerCompare;
    }
    const kindCompare = ENTITY_KIND_ORDER[left.kind] - ENTITY_KIND_ORDER[right.kind];
    if (kindCompare !== 0) {
      return kindCompare;
    }
    return entitySortKey(left).localeCompare(entitySortKey(right));
  });
}

function entitySortKey(entity: DxfEntity): string {
  switch (entity.kind) {
    case "line":
      return `${entity.start.x},${entity.start.y},${entity.end.x},${entity.end.y}`;
    case "lwpolyline":
      return entity.vertices.map((vertex) => `${vertex.x},${vertex.y}`).join(";");
    case "arc":
      return `${entity.center.x},${entity.center.y},${entity.radius},${entity.startAngleDeg},${entity.endAngleDeg}`;
    case "circle":
      return `${entity.center.x},${entity.center.y},${entity.radius}`;
    case "text":
      return `${entity.position.x},${entity.position.y},${entity.text}`;
    case "mtext":
      return `${entity.position.x},${entity.position.y},${entity.text}`;
    default: {
      const exhaustive: never = entity;
      return exhaustive;
    }
  }
}

export function createMinimalDxfDocument(overrides: Partial<DxfDocument> = {}): DxfDocument {
  return {
    header: { ...DEFAULT_DXF_HEADER, ...overrides.header },
    tables: {
      layers: overrides.tables?.layers ?? [{ ...DEFAULT_DXF_LAYER_0 }],
      linetypes: overrides.tables?.linetypes ?? [{ ...DEFAULT_DXF_LINETYPE_CONTINUOUS }],
      textStyles: overrides.tables?.textStyles ?? [{ ...DEFAULT_DXF_TEXT_STYLE }],
    },
    entities: overrides.entities ?? [],
    diagnostics: overrides.diagnostics ?? [],
  };
}
