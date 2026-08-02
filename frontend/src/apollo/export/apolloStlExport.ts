import { booleans, maths, modifiers, primitives, transforms } from "@jscad/modeling";
import { serialize } from "@jscad/stl-serializer";
import type {
  ApolloSolidGeometryParameter,
  ApolloVisualizationModel,
  ApolloVisualizationVisibilityGroup,
} from "../visualization";
import type { ApolloStlBoundingBoxMm, ApolloStlEntityCounts, ApolloStlExportManifest } from "./apolloExportManifest";
import { APOLLO_STL_MANIFEST_SCHEMA_VERSION } from "./apolloExportManifest";

type JscadGeom3 = ReturnType<typeof primitives.cuboid>;

const STL_MIME_TYPE = "model/stl";
const MANIFEST_MIME_TYPE = "application/json";
const STL_SEGMENTS = 24;
const ZERO_AREA_EPSILON = 1e-6;
const SUPPORTED_GROUPS = ["girders", "cross-beams", "bracings", "deck", "bearings", "markers"] as const;

export type ApolloStlExportOptions = {
  readonly includedGroups?: readonly ApolloVisualizationVisibilityGroup[];
  readonly visibleOnly?: boolean;
  readonly originShiftMm?: readonly [number, number, number];
  readonly includeMarkers?: boolean;
  readonly includeBearings?: boolean;
  readonly includeDeck?: boolean;
  readonly includeBracing?: boolean;
  readonly includeCrossBeams?: boolean;
  readonly includeGirders?: boolean;
};

type ApolloJscadSerializedPart = string | ArrayBuffer | ArrayBufferView;

export type ApolloBinaryStlTriangle = {
  readonly normal: readonly [number, number, number];
  readonly vertices: readonly [
    readonly [number, number, number],
    readonly [number, number, number],
    readonly [number, number, number],
  ];
  readonly attributeByteCount: number;
};

export type ApolloBinaryStlParseResult = {
  readonly header: string;
  readonly triangleCount: number;
  readonly triangles: readonly ApolloBinaryStlTriangle[];
};

export type ApolloBinaryStlExportResult = {
  readonly bytes: Uint8Array;
  readonly manifest: ApolloStlExportManifest;
  readonly warnings: readonly string[];
  readonly triangleCount: number;
  readonly boundingBoxMm: ApolloStlBoundingBoxMm;
  readonly digest: string;
};

export type ApolloBinaryStlValidation = {
  readonly invalidCoordinateCount: number;
  readonly zeroAreaCount: number;
};

export type ApolloBrowserDownloadResult = {
  readonly stlFileName: string;
  readonly manifestFileName: string;
};

type ExportBuild = {
  readonly solids: readonly ApolloSolidGeometryParameter[];
  readonly includedGroups: readonly ApolloVisualizationVisibilityGroup[];
  readonly excludedGroups: readonly ApolloVisualizationVisibilityGroup[];
  readonly warnings: string[];
};

type MutableBox = {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
};

export function exportApolloBinaryStl(
  model: ApolloVisualizationModel,
  options: ApolloStlExportOptions = {},
): ApolloBinaryStlExportResult {
  const exportBuild = resolveExportSolids(model, options);
  if (exportBuild.solids.length === 0) {
    throw new Error("Apollo STL export requires at least one exportable solid.");
  }

  const geometriesForExport = exportBuild.solids
    .map((solid) => buildGeometryForSolid(solid, options.originShiftMm ?? [0, 0, 0], exportBuild.warnings))
    .filter((geometry): geometry is JscadGeom3 => geometry !== null);

  if (geometriesForExport.length === 0) {
    throw new Error("Apollo STL export did not produce any supported geometry.");
  }

  const triangulated = (modifiers.generalize as unknown as (
    options: { snap: boolean; triangulate: boolean },
    ...geometries: JscadGeom3[]
  ) => JscadGeom3[])({ snap: true, triangulate: true }, ...geometriesForExport);
  const stlParts = serialize({ binary: true }, ...triangulated) as ApolloJscadSerializedPart[];
  const bytes = concatenateBinaryParts(stlParts);
  const parsed = parseBinaryStl(bytes);
  if (parsed.triangleCount === 0) {
    throw new Error("Apollo STL export produced an empty binary STL.");
  }

  const validation = validateApolloBinaryStlTriangles(parsed.triangles);
  if (validation.invalidCoordinateCount > 0) {
    throw new Error(`Apollo STL export produced ${validation.invalidCoordinateCount} triangles with non-finite coordinates.`);
  }
  if (validation.zeroAreaCount > 0) {
    throw new Error(`Apollo STL export produced ${validation.zeroAreaCount} zero-area triangles.`);
  }

  const boundingBoxMm = computeBoundingBoxMm(parsed.triangles);
  const digest = computeFnv1aDigest(bytes);
  const warnings = [...model.warnings.map((entry) => `${entry.code}: ${entry.message}`), ...exportBuild.warnings];
  const manifest = buildManifest(
    model,
    options.originShiftMm ?? [0, 0, 0],
    exportBuild.includedGroups,
    exportBuild.excludedGroups,
    exportBuild.solids,
    parsed.triangleCount,
    boundingBoxMm,
    warnings,
    digest,
  );

  return {
    bytes,
    manifest,
    warnings,
    triangleCount: parsed.triangleCount,
    boundingBoxMm,
    digest,
  };
}

export function downloadApolloBinaryStlBundle(
  model: ApolloVisualizationModel,
  options: ApolloStlExportOptions = {},
): ApolloBrowserDownloadResult {
  const result = exportApolloBinaryStl(model, options);
  const baseName = sanitizeFileName(model.sourceProjectName || model.sourceProjectId || "apollo-bridge-model");
  const stlFileName = ensureExtension(baseName, ".stl");
  const manifestFileName = ensureExtension(baseName, ".apollo.json");
  const stlArrayBuffer = result.bytes.buffer.slice(
    result.bytes.byteOffset,
    result.bytes.byteOffset + result.bytes.byteLength,
  ) as ArrayBuffer;
  downloadBlob(stlFileName, new Blob([stlArrayBuffer], { type: STL_MIME_TYPE }));
  downloadBlob(
    manifestFileName,
    new Blob([`${JSON.stringify(result.manifest, null, 2)}\n`], { type: MANIFEST_MIME_TYPE }),
  );
  return { stlFileName, manifestFileName };
}

export function parseBinaryStl(bytes: Uint8Array): ApolloBinaryStlParseResult {
  if (bytes.byteLength < 84) {
    throw new Error("Binary STL payload is too short.");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const triangleCount = view.getUint32(80, true);
  const expectedLength = 84 + triangleCount * 50;
  if (bytes.byteLength !== expectedLength) {
    throw new Error(`Binary STL byte length mismatch: expected ${expectedLength}, received ${bytes.byteLength}.`);
  }

  const triangles: ApolloBinaryStlTriangle[] = [];
  let offset = 84;
  for (let index = 0; index < triangleCount; index += 1) {
    const normal = readVector3(view, offset);
    const vertex1 = readVector3(view, offset + 12);
    const vertex2 = readVector3(view, offset + 24);
    const vertex3 = readVector3(view, offset + 36);
    const attributeByteCount = view.getUint16(offset + 48, true);
    triangles.push({
      normal,
      vertices: [vertex1, vertex2, vertex3],
      attributeByteCount,
    });
    offset += 50;
  }

  const header = new TextDecoder().decode(bytes.slice(0, 80)).replace(/\0+$/u, "");
  return { header, triangleCount, triangles };
}

export function sanitizeFileName(name: string): string {
  const normalized = name
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || "apollo-bridge-model";
}

export function ensureExtension(fileName: string, extension: string): string {
  return fileName.toLowerCase().endsWith(extension.toLowerCase()) ? fileName : `${fileName}${extension}`;
}

function resolveExportSolids(
  model: ApolloVisualizationModel,
  options: ApolloStlExportOptions,
): ExportBuild {
  const toggledGroups = new Set<ApolloVisualizationVisibilityGroup>();
  if (options.includeGirders !== false) toggledGroups.add("girders");
  if (options.includeCrossBeams !== false) toggledGroups.add("cross-beams");
  if (options.includeBracing !== false) toggledGroups.add("bracings");
  if (options.includeDeck !== false) toggledGroups.add("deck");
  if (options.includeBearings !== false) toggledGroups.add("bearings");
  if (options.includeMarkers === true) toggledGroups.add("markers");

  const requestedGroups = options.includedGroups ? new Set(options.includedGroups) : null;
  const includedGroups = SUPPORTED_GROUPS.filter((group) => toggledGroups.has(group) && (requestedGroups == null || requestedGroups.has(group)));
  const excludedGroups = SUPPORTED_GROUPS.filter((group) => !includedGroups.includes(group));
  const warnings: string[] = [];

  const solids = model.solidGeometryParameters
    .filter((solid) => {
      if (!includedGroups.includes(solid.visibilityGroup as typeof includedGroups[number])) return false;
      if (!solid.exportable && !(solid.visibilityGroup === "markers" && options.includeMarkers === true)) return false;
      return true;
    })
    .sort((left, right) => left.id.localeCompare(right.id));

  if (options.visibleOnly && requestedGroups == null) {
    warnings.push("visibleOnly was requested without explicit includedGroups; export fell back to current toggle-derived defaults.");
  }

  return {
    solids,
    includedGroups,
    excludedGroups,
    warnings,
  };
}

function buildGeometryForSolid(
  solid: ApolloSolidGeometryParameter,
  originShiftMm: readonly [number, number, number],
  warnings: string[],
): JscadGeom3 | null {
  try {
    if (solid.kind === "girder") {
      return buildGirderGeometry(solid, originShiftMm);
    }
    if (solid.kind === "cross_beam") {
      return buildBoxGeometry(solid, solid.dimensionsM.length, solid.dimensionsM.width, solid.dimensionsM.depth, originShiftMm);
    }
    if (solid.kind === "deck") {
      return buildBoxGeometry(solid, solid.dimensionsM.length, solid.dimensionsM.width, solid.dimensionsM.thickness, originShiftMm);
    }
    if (solid.kind === "bearing") {
      return buildBoxGeometry(solid, solid.dimensionsM.length, solid.dimensionsM.width, solid.dimensionsM.height, originShiftMm);
    }
    if (solid.kind === "pier_marker" || solid.kind === "abutment_marker") {
      return buildBoxGeometry(solid, solid.dimensionsM.length, solid.dimensionsM.width, solid.dimensionsM.height, originShiftMm);
    }
    if (solid.kind === "bracing") {
      return buildBracingGeometry(solid, originShiftMm);
    }
    if (solid.kind === "stiffener") {
      return buildBoxGeometry(solid, solid.dimensionsM.length, solid.dimensionsM.width, solid.dimensionsM.height, originShiftMm);
    }
  } catch (error) {
    warnings.push(`unsupported solid ${solid.id}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
  warnings.push(`unsupported solid kind ${solid.kind} on ${solid.id}; skipped.`);
  return null;
}

function buildGirderGeometry(
  solid: ApolloSolidGeometryParameter,
  originShiftMm: readonly [number, number, number],
): JscadGeom3 {
  const length = toMillimeters(solid.dimensionsM.length);
  const depth = toMillimeters(solid.dimensionsM.depth);
  const flangeWidth = toMillimeters(solid.dimensionsM.flangeWidth);
  const flangeThickness = toMillimeters(solid.dimensionsM.flangeThickness);
  const webThickness = toMillimeters(solid.dimensionsM.webThickness);
  const shape = solid.dimensionsM.shape;
  if (!isPositiveFinite(length) || !isPositiveFinite(depth) || !isPositiveFinite(flangeWidth)) {
    throw new Error("invalid girder dimensions");
  }

  const geometry = shape === 1 && isPositiveFinite(flangeThickness) && isPositiveFinite(webThickness) && flangeThickness * 2 < depth && webThickness < flangeWidth
    ? booleans.union(
        primitives.cuboid({ size: [length, flangeWidth, flangeThickness], center: [0, 0, depth / 2 - flangeThickness / 2] }),
        primitives.cuboid({ size: [length, flangeWidth, flangeThickness], center: [0, 0, -depth / 2 + flangeThickness / 2] }),
        primitives.cuboid({ size: [length, webThickness, depth - flangeThickness * 2], center: [0, 0, 0] }),
      ) as JscadGeom3
    : primitives.cuboid({ size: [length, flangeWidth, depth], center: [0, 0, 0] });
  return placeGeometry(geometry, solid, originShiftMm);
}

function buildBoxGeometry(
  solid: ApolloSolidGeometryParameter,
  lengthM: number,
  widthM: number,
  heightM: number,
  originShiftMm: readonly [number, number, number],
): JscadGeom3 {
  const length = toMillimeters(lengthM);
  const width = toMillimeters(widthM);
  const height = toMillimeters(heightM);
  if (!isPositiveFinite(length) || !isPositiveFinite(width) || !isPositiveFinite(height)) {
    throw new Error("invalid box dimensions");
  }
  return placeGeometry(
    primitives.cuboid({
      size: [length, width, height],
      center: [0, 0, 0],
    }),
    solid,
    originShiftMm,
  );
}

function buildBracingGeometry(
  solid: ApolloSolidGeometryParameter,
  originShiftMm: readonly [number, number, number],
): JscadGeom3 {
  const length = toMillimeters(solid.dimensionsM.length);
  const diameter = toMillimeters(solid.dimensionsM.diameter);
  if (!isPositiveFinite(length) || !isPositiveFinite(diameter)) {
    throw new Error("invalid bracing dimensions");
  }
  const base = transforms.rotateY(Math.PI / 2, primitives.cylinder({
    radius: diameter / 2,
    height: length,
    center: [0, 0, 0],
    segments: STL_SEGMENTS,
  })) as JscadGeom3;
  return placeGeometry(base, solid, originShiftMm);
}

function placeGeometry(
  geometry: JscadGeom3,
  solid: ApolloSolidGeometryParameter,
  originShiftMm: readonly [number, number, number],
): JscadGeom3 {
  const matrix = buildFrameMatrix(solid.localFrame, originShiftMm);
  return transforms.transform(matrix, geometry) as JscadGeom3;
}

function buildFrameMatrix(
  frame: ApolloSolidGeometryParameter["localFrame"],
  originShiftMm: readonly [number, number, number],
) {
  const origin = [
    toMillimeters(frame.origin[0]) - originShiftMm[0],
    toMillimeters(frame.origin[1]) - originShiftMm[1],
    toMillimeters(frame.origin[2]) - originShiftMm[2],
  ] as const;
  const xAxis = frame.xAxis;
  const yAxis = frame.yAxis;
  const zAxis = frame.zAxis;
  return maths.mat4.fromValues(
    xAxis[0], xAxis[1], xAxis[2], 0,
    yAxis[0], yAxis[1], yAxis[2], 0,
    zAxis[0], zAxis[1], zAxis[2], 0,
    origin[0], origin[1], origin[2], 1,
  );
}

function concatenateBinaryParts(parts: readonly ApolloJscadSerializedPart[]): Uint8Array {
  const normalized = parts.map(normalizeBinaryPart);
  const totalLength = normalized.reduce((sum, part) => sum + part.byteLength, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of normalized) {
    output.set(part, offset);
    offset += part.byteLength;
  }
  return output;
}

function normalizeBinaryPart(part: ApolloJscadSerializedPart): Uint8Array {
  if (typeof part === "string") {
    return new TextEncoder().encode(part);
  }
  if (part instanceof ArrayBuffer) {
    return new Uint8Array(part);
  }
  if (ArrayBuffer.isView(part)) {
    return new Uint8Array(part.buffer, part.byteOffset, part.byteLength);
  }
  throw new Error(`Unsupported STL binary part: ${Object.prototype.toString.call(part)}`);
}

export function validateApolloBinaryStlTriangles(
  triangles: readonly ApolloBinaryStlTriangle[],
): ApolloBinaryStlValidation {
  return validateTriangles(triangles);
}

function validateTriangles(triangles: readonly ApolloBinaryStlTriangle[]): ApolloBinaryStlValidation {
  let invalidCoordinateCount = 0;
  let zeroAreaCount = 0;
  for (const triangle of triangles) {
    const [a, b, c] = triangle.vertices;
    const values = [...triangle.normal, ...a, ...b, ...c];
    if (!values.every(Number.isFinite)) {
      invalidCoordinateCount += 1;
      continue;
    }
    const area = triangleArea(a, b, c);
    if (!(area > ZERO_AREA_EPSILON)) {
      zeroAreaCount += 1;
    }
  }
  return { invalidCoordinateCount, zeroAreaCount };
}

function triangleArea(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  c: readonly [number, number, number],
): number {
  const abX = b[0] - a[0];
  const abY = b[1] - a[1];
  const abZ = b[2] - a[2];
  const acX = c[0] - a[0];
  const acY = c[1] - a[1];
  const acZ = c[2] - a[2];
  const crossX = abY * acZ - abZ * acY;
  const crossY = abZ * acX - abX * acZ;
  const crossZ = abX * acY - abY * acX;
  return 0.5 * Math.hypot(crossX, crossY, crossZ);
}

function computeBoundingBoxMm(triangles: readonly ApolloBinaryStlTriangle[]): ApolloStlBoundingBoxMm {
  const box: MutableBox = {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    minZ: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
    maxZ: Number.NEGATIVE_INFINITY,
  };
  for (const triangle of triangles) {
    for (const vertex of triangle.vertices) {
      box.minX = Math.min(box.minX, vertex[0]);
      box.minY = Math.min(box.minY, vertex[1]);
      box.minZ = Math.min(box.minZ, vertex[2]);
      box.maxX = Math.max(box.maxX, vertex[0]);
      box.maxY = Math.max(box.maxY, vertex[1]);
      box.maxZ = Math.max(box.maxZ, vertex[2]);
    }
  }
  if (!Number.isFinite(box.minX)) {
    throw new Error("Unable to compute STL bounding box.");
  }
  return {
    min: [box.minX, box.minY, box.minZ],
    max: [box.maxX, box.maxY, box.maxZ],
  };
}

function buildManifest(
  model: ApolloVisualizationModel,
  originShiftMm: readonly [number, number, number],
  includedGroups: readonly ApolloVisualizationVisibilityGroup[],
  excludedGroups: readonly ApolloVisualizationVisibilityGroup[],
  solids: readonly ApolloSolidGeometryParameter[],
  triangleCount: number,
  boundingBoxMm: ApolloStlBoundingBoxMm,
  warnings: readonly string[],
  digest: string,
): ApolloStlExportManifest {
  return {
    schemaVersion: APOLLO_STL_MANIFEST_SCHEMA_VERSION,
    exportKind: "apollo-3d-stl",
    projectId: model.sourceProjectId,
    projectName: model.sourceProjectName,
    exportedAt: new Date().toISOString(),
    sourceSchemaVersions: {
      project: model.sourceSchemaVersion,
      visualizationContract: model.contractVersion,
    },
    sourceRevision: model.sourceRevision,
    visualizationContractVersion: model.contractVersion,
    axisConvention: model.coordinateSystem.axisConvention,
    sourceUnit: model.units.sourceLength,
    exportUnit: model.units.exportLength,
    originShiftMm,
    includedGroups,
    excludedGroups,
    entityCounts: countEntities(solids),
    triangleCount,
    boundingBoxMm,
    assumptions: model.assumptions,
    warnings,
    digest,
  };
}

function countEntities(solids: readonly ApolloSolidGeometryParameter[]): ApolloStlEntityCounts {
  let girders = 0;
  let crossBeams = 0;
  let bracings = 0;
  let stiffeners = 0;
  let deck = 0;
  let bearings = 0;
  let markers = 0;
  for (const solid of solids) {
    if (solid.kind === "girder") girders += 1;
    else if (solid.kind === "cross_beam") crossBeams += 1;
    else if (solid.kind === "bracing") bracings += 1;
    else if (solid.kind === "stiffener") stiffeners += 1;
    else if (solid.kind === "deck") deck += 1;
    else if (solid.kind === "bearing") bearings += 1;
    else markers += 1;
  }
  return {
    total: solids.length,
    girders,
    crossBeams,
    bracings,
    stiffeners,
    deck,
    bearings,
    markers,
  };
}

function readVector3(view: DataView, offset: number): readonly [number, number, number] {
  return [
    view.getFloat32(offset, true),
    view.getFloat32(offset + 4, true),
    view.getFloat32(offset + 8, true),
  ];
}

function downloadBlob(fileName: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function computeFnv1aDigest(bytes: Uint8Array): string {
  let hash = 0x811c9dc5;
  for (const value of bytes) {
    hash ^= value;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a32:${hash.toString(16).padStart(8, "0")}`;
}

function toMillimeters(lengthM: number): number {
  return Math.round(lengthM * 1000);
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}
