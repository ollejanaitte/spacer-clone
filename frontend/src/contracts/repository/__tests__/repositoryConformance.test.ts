import { describe, expect, it } from "vitest";
import type { BridgeFrameAnalysisDocument } from "../../bridgeFrameAnalysisDocument";
import type { RoadDesignDocument } from "../../roadDesignDocument";
import type { RoadToFrameTransferPackage } from "../../roadToFrameTransferPackage";
import type { TransferRecord } from "../../transferRecord";
import {
  ROAD_TO_FRAME_TRANSFER_PACKAGE_SCHEMA_VERSION,
  requireSchemaVersion,
} from "../../index";
import {
  createInMemoryBridgeFrameAnalysisDocumentRepository,
  createInMemoryRoadDesignDocumentRepository,
  createInMemoryRoadToFrameTransferPackageRepository,
  createInMemoryTransferRecordRepository,
  isRepositoryErrorCode,
  isRepositoryImmutableResourceError,
  isRepositoryNotFoundError,
  type BridgeFrameAnalysisDocumentRepository,
  type RepositoryFaultInjection,
  type RoadDesignDocumentRepository,
  type RoadToFrameTransferPackageRepository,
  type TransferRecordRepository,
} from "../index";
import {
  FRAME_DOC_ID,
  PACKAGE_ID,
  RECORD_ID,
  ROAD_DOC_ID,
  createValidBridgeFrameAnalysisDocument,
  createValidRoadDesignDocument,
  createValidTransferPackage,
  createValidTransferRecord,
} from "./fixtures";
import { runAppendOnlyRecordConformanceSuite, runImmutablePackageConformanceSuite } from "./packageAndRecordConformance";
import { runRevisionedDocumentConformanceSuite } from "./revisionedDocumentConformance";

function createRoadRepository(faultInjection?: RepositoryFaultInjection) {
  return createInMemoryRoadDesignDocumentRepository({ faultInjection });
}

function createFrameRepository(faultInjection?: RepositoryFaultInjection) {
  return createInMemoryBridgeFrameAnalysisDocumentRepository({ faultInjection });
}

function createPackageRepository(faultInjection?: RepositoryFaultInjection) {
  return createInMemoryRoadToFrameTransferPackageRepository({ faultInjection });
}

function createRecordRepository(faultInjection?: RepositoryFaultInjection) {
  return createInMemoryTransferRecordRepository({ faultInjection });
}

function nextRoadRevision(_current: RoadDesignDocument, revisionId: number): RoadDesignDocument {
  return createValidRoadDesignDocument(revisionId);
}

function nextFrameRevision(
  _current: BridgeFrameAnalysisDocument,
  revisionId: number,
): BridgeFrameAnalysisDocument {
  return createValidBridgeFrameAnalysisDocument(revisionId);
}

function invalidRoadDocument() {
  return {
    ...createValidRoadDesignDocument(),
    documentKind: "bridge-frame-analysis",
  };
}

function invalidFrameDocument() {
  return {
    ...createValidBridgeFrameAnalysisDocument(),
    documentKind: "road-design",
  };
}

function invalidTransferPackage() {
  return {
    ...createValidTransferPackage(),
    packageId: "not-a-uuid",
  };
}

function invalidTransferRecord() {
  return {
    ...createValidTransferRecord(),
    recordId: "not-a-uuid",
  };
}

function mutateRoadDocument(document: RoadDesignDocument): void {
  const mutable = document as RoadDesignDocument & {
    alignments: Array<{ label: string }>;
  };
  if (mutable.alignments[0] !== undefined) {
    mutable.alignments[0].label = "mutated";
  }
}

function mutateFrameDocument(document: BridgeFrameAnalysisDocument): void {
  const mutable = document as BridgeFrameAnalysisDocument & {
    structuralModel: { nodes: Array<{ x: number }> };
  };
  if (mutable.structuralModel.nodes[0] !== undefined) {
    mutable.structuralModel.nodes[0].x = 999;
  }
}

function mutateTransferPackage(pkg: RoadToFrameTransferPackage): void {
  const mutable = pkg as RoadToFrameTransferPackage & {
    capabilities: Array<{ capabilityId: string }>;
  };
  if (mutable.capabilities[0] !== undefined) {
    mutable.capabilities[0].capabilityId = "mutated";
  }
}

function mutateTransferRecord(record: TransferRecord): void {
  const mutable = record as TransferRecord & {
    capabilityAssessment: Array<{ capabilityId: string }>;
  };
  if (mutable.capabilityAssessment[0] !== undefined) {
    mutable.capabilityAssessment[0].capabilityId = "mutated";
  }
}

describe("Step 0C1 repository ports and in-memory conformance", () => {
  describe("repository public exports typecheck", () => {
    it("constructs all four repository ports", () => {
      const roadRepository: RoadDesignDocumentRepository = createRoadRepository();
      const frameRepository: BridgeFrameAnalysisDocumentRepository = createFrameRepository();
      const packageRepository: RoadToFrameTransferPackageRepository = createPackageRepository();
      const recordRepository: TransferRecordRepository = createRecordRepository();

      expect(roadRepository.create).toBeTypeOf("function");
      expect(frameRepository.create).toBeTypeOf("function");
      expect(packageRepository.create).toBeTypeOf("function");
      expect(recordRepository.append).toBeTypeOf("function");
    });

    it("exposes identifiable repository error codes", () => {
      for (const code of [
        "not-found",
        "already-exists",
        "revision-conflict",
        "validation-failed",
        "immutable-resource",
        "append-only-violation",
      ] as const) {
        expect(isRepositoryErrorCode(code)).toBe(true);
      }
    });
  });

  runRevisionedDocumentConformanceSuite<RoadDesignDocument>({
    name: "RoadDesignDocument",
    documentId: ROAD_DOC_ID,
    createRepository: createRoadRepository,
    createInitialDocument: () => createValidRoadDesignDocument(),
    createNextRevision: nextRoadRevision,
    createInvalidDocument: invalidRoadDocument,
    mutateReadValue: mutateRoadDocument,
  });

  runRevisionedDocumentConformanceSuite<BridgeFrameAnalysisDocument>({
    name: "BridgeFrameAnalysisDocument",
    documentId: FRAME_DOC_ID,
    createRepository: createFrameRepository,
    createInitialDocument: () => createValidBridgeFrameAnalysisDocument(),
    createNextRevision: nextFrameRevision,
    createInvalidDocument: invalidFrameDocument,
    mutateReadValue: mutateFrameDocument,
  });

  runImmutablePackageConformanceSuite<RoadToFrameTransferPackage>({
    name: "RoadToFrameTransferPackage",
    identity: {
      packageId: PACKAGE_ID,
      schemaVersion: ROAD_TO_FRAME_TRANSFER_PACKAGE_SCHEMA_VERSION,
    },
    createRepository: createPackageRepository,
    createPackage: createValidTransferPackage,
    createInvalidPackage: invalidTransferPackage,
    mutateReadValue: mutateTransferPackage,
  });

  runAppendOnlyRecordConformanceSuite<TransferRecord>({
    name: "TransferRecord",
    recordId: RECORD_ID,
    createRepository: createRecordRepository,
    createRecord: (recordId = RECORD_ID) => createValidTransferRecord(recordId),
    createInvalidRecord: invalidTransferRecord,
    mutateReadValue: mutateTransferRecord,
  });

  describe("RoadToFrameTransferPackage identity semantics", () => {
    it("rejects duplicate identity as immutable-resource", () => {
      const repository = createPackageRepository();
      const pkg = createValidTransferPackage();
      expect(repository.create(pkg).ok).toBe(true);

      const duplicate = repository.create(pkg);
      expect(duplicate.ok).toBe(false);
      if (!duplicate.ok) {
        expect(isRepositoryImmutableResourceError(duplicate.error)).toBe(true);
      }
    });

    it("reads by package/version identity", () => {
      const repository = createPackageRepository();
      const pkg = createValidTransferPackage();
      expect(repository.create(pkg).ok).toBe(true);

      const wrongVersion = repository.read({
        packageId: PACKAGE_ID,
        schemaVersion: requireSchemaVersion("9.9.9"),
      });
      expect(wrongVersion.ok).toBe(false);
      if (!wrongVersion.ok) {
        expect(isRepositoryNotFoundError(wrongVersion.error)).toBe(true);
      }
    });
  });
});
