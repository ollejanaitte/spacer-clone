export {
  PERSISTENCE_ERROR_CODES,
  createPersistenceAdapterFailedError,
  createPersistenceLegacyWriteForbiddenError,
  createPersistenceMalformedJsonError,
  createPersistenceMigrationFailedError,
  createPersistenceMissingVersionError,
  createPersistenceStoreFailedError,
  createPersistenceUnsupportedFormatError,
  createPersistenceUnsupportedVersionError,
  createPersistenceValidationFailedError,
  type PersistenceAdapterFailedError,
  type PersistenceError,
  type PersistenceErrorCode,
  type PersistenceLegacyWriteForbiddenError,
  type PersistenceMalformedJsonError,
  type PersistenceMigrationFailedError,
  type PersistenceMissingVersionError,
  type PersistenceStoreFailedError,
  type PersistenceUnsupportedFormatError,
  type PersistenceUnsupportedVersionError,
  type PersistenceValidationFailedError,
} from "./errors";

export {
  checksumForSerializedDocument,
  createInMemoryAtomicJsonStore,
  parseRawJson,
  serializeTargetDocument,
} from "./atomicStore";

export {
  isTargetFrameDocument,
  isTargetRoadDocument,
  loadBridgeFrameAnalysisDocument,
  loadRoadDesignDocument,
  normalizeRawInput,
  type LoadDocumentDependencies,
} from "./loadDocument";

export {
  saveBridgeFrameAnalysisDocument,
  saveRoadDesignDocument,
} from "./saveDocument";

export {
  createDocumentPersistenceGateway,
  type DocumentPersistenceGateway,
  type DocumentPersistenceGatewayOptions,
} from "./documentGateway";

export { projectLinerDomainDraftToRoadDesignDocument } from "./linerDomainDraftBridge";

export type {
  AtomicJsonStorePort,
  DocumentGatewayClock,
  DocumentLoadFailure,
  DocumentLoadResult,
  DocumentLoadSourceKind,
  DocumentLoadSuccess,
  DocumentSaveFailure,
  DocumentSaveResult,
  DocumentSaveSuccess,
} from "./types";
