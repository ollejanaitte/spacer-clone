import type { BridgeFrameAnalysisDocument } from "../bridgeFrameAnalysisDocument";
import type { RoadDesignDocument } from "../roadDesignDocument";
import {
  createInMemoryBridgeFrameAnalysisDocumentRepository,
  createInMemoryRoadDesignDocumentRepository,
  type BridgeFrameAnalysisDocumentRepository,
  type RoadDesignDocumentRepository,
} from "../repository";
import { createInMemoryAtomicJsonStore } from "./atomicStore";
import {
  createPersistenceStoreFailedError,
  createPersistenceValidationFailedError,
  type PersistenceStoreFailedError,
  type PersistenceValidationFailedError,
} from "./errors";
import {
  loadBridgeFrameAnalysisDocument,
  loadRoadDesignDocument,
  type LoadDocumentDependencies,
} from "./loadDocument";
import {
  saveBridgeFrameAnalysisDocument,
  saveRoadDesignDocument,
} from "./saveDocument";
import type {
  AtomicJsonStorePort,
  DocumentLoadResult,
  DocumentSaveResult,
} from "./types";

type PersistResult<TDocument> =
  | { readonly ok: true; readonly document: TDocument }
  | {
      readonly ok: false;
      readonly error: PersistenceStoreFailedError | PersistenceValidationFailedError;
    };

export interface DocumentPersistenceGateway {
  loadRoad(raw: unknown): DocumentLoadResult<RoadDesignDocument>;
  loadFrame(raw: unknown): DocumentLoadResult<BridgeFrameAnalysisDocument>;
  saveRoad(
    document: RoadDesignDocument,
    path: string,
    options?: { readonly createOnly?: boolean; readonly expectedChecksum?: string },
  ): DocumentSaveResult;
  saveFrame(
    document: BridgeFrameAnalysisDocument,
    path: string,
    options?: { readonly createOnly?: boolean; readonly expectedChecksum?: string },
  ): DocumentSaveResult;
  persistRoadToRepository(document: RoadDesignDocument): PersistResult<RoadDesignDocument>;
  persistFrameToRepository(
    document: BridgeFrameAnalysisDocument,
  ): PersistResult<BridgeFrameAnalysisDocument>;
  readRoadFromStore(path: string): DocumentLoadResult<RoadDesignDocument>;
  readFrameFromStore(path: string): DocumentLoadResult<BridgeFrameAnalysisDocument>;
  readonly roadRepository: RoadDesignDocumentRepository;
  readonly frameRepository: BridgeFrameAnalysisDocumentRepository;
  readonly store: AtomicJsonStorePort;
}

export interface DocumentPersistenceGatewayOptions extends LoadDocumentDependencies {
  readonly store?: AtomicJsonStorePort;
  readonly roadRepository?: RoadDesignDocumentRepository;
  readonly frameRepository?: BridgeFrameAnalysisDocumentRepository;
}

/**
 * Integrates legacy adapters, migration framework, repositories, and atomic JSON storage
 * under a read-old / write-target policy.
 */
export function createDocumentPersistenceGateway(
  options: DocumentPersistenceGatewayOptions = {},
): DocumentPersistenceGateway {
  const store = options.store ?? createInMemoryAtomicJsonStore();
  const roadRepository =
    options.roadRepository ?? createInMemoryRoadDesignDocumentRepository();
  const frameRepository =
    options.frameRepository ?? createInMemoryBridgeFrameAnalysisDocumentRepository();
  const loadOptions: LoadDocumentDependencies = {
    migrationRegistry: options.migrationRegistry,
    clock: options.clock,
    createdAt: options.createdAt,
  };

  return {
    roadRepository,
    frameRepository,
    store,
    loadRoad(raw) {
      return loadRoadDesignDocument(raw, loadOptions);
    },
    loadFrame(raw) {
      return loadBridgeFrameAnalysisDocument(raw, loadOptions);
    },
    saveRoad(document, path, saveOptions) {
      return saveRoadDesignDocument(document, path, store, saveOptions);
    },
    saveFrame(document, path, saveOptions) {
      return saveBridgeFrameAnalysisDocument(document, path, store, saveOptions);
    },
    persistRoadToRepository(document) {
      const created = roadRepository.create(document);
      if (!created.ok) {
        if (created.error.code === "validation-failed") {
          return {
            ok: false as const,
            error: createPersistenceValidationFailedError(created.error.validation),
          };
        }
        return {
          ok: false as const,
          error: createPersistenceStoreFailedError(created.error.message),
        };
      }
      return { ok: true as const, document: created.value };
    },
    persistFrameToRepository(document) {
      const created = frameRepository.create(document);
      if (!created.ok) {
        if (created.error.code === "validation-failed") {
          return {
            ok: false as const,
            error: createPersistenceValidationFailedError(created.error.validation),
          };
        }
        return {
          ok: false as const,
          error: createPersistenceStoreFailedError(created.error.message),
        };
      }
      return { ok: true as const, document: created.value };
    },
    readRoadFromStore(path) {
      try {
        return loadRoadDesignDocument(store.read(path), loadOptions);
      } catch (cause) {
        const causeMessage = cause instanceof Error ? cause.message : String(cause);
        return { ok: false, error: createPersistenceStoreFailedError(causeMessage) };
      }
    },
    readFrameFromStore(path) {
      try {
        return loadBridgeFrameAnalysisDocument(store.read(path), loadOptions);
      } catch (cause) {
        const causeMessage = cause instanceof Error ? cause.message : String(cause);
        return { ok: false, error: createPersistenceStoreFailedError(causeMessage) };
      }
    },
  };
}
