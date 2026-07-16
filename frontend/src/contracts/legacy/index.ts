export {
  LEGACY_ADAPTER_ERROR_CODES,
  createLegacyAmbiguousCoordinateError,
  createLegacyAmbiguousUnitError,
  createLegacyBrokenIdError,
  createLegacyInvalidShapeError,
  createLegacyMissingVersionError,
  createLegacyMixedOwnershipError,
  createLegacyUnresolvedReferenceError,
  createLegacyUnsupportedFormatError,
  createLegacyUnsupportedVersionError,
  createLegacyValidationFailedError,
  isLegacyAdapterErrorCode,
  type LegacyAdapterError,
  type LegacyAdapterErrorCode,
  type LegacyAmbiguousCoordinateError,
  type LegacyAmbiguousUnitError,
  type LegacyBrokenIdError,
  type LegacyInvalidShapeError,
  type LegacyMissingVersionError,
  type LegacyMixedOwnershipError,
  type LegacyUnresolvedReferenceError,
  type LegacyUnsupportedFormatError,
  type LegacyUnsupportedVersionError,
  type LegacyValidationFailedError,
} from "./errors";

export { cloneLegacyValue } from "./clone";
export { classifyLegacyInput, isPlainLegacyObject } from "./classify";
export { deriveStableUuid } from "./idStability";
export {
  canonicalJsonForChecksum,
  computeContentChecksum,
  computeSha256Hex,
} from "./checksum";

export {
  LEGACY_ADAPTER_VERSION,
  LEGACY_FRAME_ADAPTER_ID,
  LEGACY_FRAME_FORMAT_ID,
  LEGACY_ROAD_ADAPTER_ID,
  LEGACY_ROAD_FORMAT_ID,
  defaultLegacyAdapterClock,
  type LegacyAdapterClock,
  type LegacyAdapterFailure,
  type LegacyAdapterOptions,
  type LegacyAdapterResult,
  type LegacyAdapterSuccess,
  type LegacyFormatClassification,
  type LegacyFormatId,
  type LegacyFrameFormatId,
  type LegacyRoadFormatId,
} from "./types";

export { adaptLegacyRoadInput, isLegacyRoadInput } from "./road/adapter";
export { adaptLegacyFrameInput, isLegacyFrameInput } from "./frame/adapter";
