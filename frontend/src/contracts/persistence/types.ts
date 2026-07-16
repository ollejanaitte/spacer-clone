import type { ContentChecksum } from "../contentChecksum";
import type { MigrationReport } from "../migration";
import type { PersistenceError } from "./errors";

export type DocumentLoadSourceKind = "target" | "legacy";

export interface DocumentLoadSuccess<TDocument> {
  readonly ok: true;
  readonly document: TDocument;
  readonly sourceKind: DocumentLoadSourceKind;
  readonly sourceFormatId: string;
  readonly sourceVersion: string;
  readonly migrationReport?: MigrationReport<TDocument>;
}

export interface DocumentLoadFailure {
  readonly ok: false;
  readonly error: PersistenceError;
}

export type DocumentLoadResult<TDocument> =
  | DocumentLoadSuccess<TDocument>
  | DocumentLoadFailure;

export interface DocumentSaveSuccess {
  readonly ok: true;
  readonly path: string;
  readonly checksum: ContentChecksum;
  readonly bytesWritten: number;
}

export interface DocumentSaveFailure {
  readonly ok: false;
  readonly error: PersistenceError;
}

export type DocumentSaveResult = DocumentSaveSuccess | DocumentSaveFailure;

export interface AtomicJsonStorePort {
  store(
    path: string,
    data: unknown,
    options?: { readonly createOnly?: boolean; readonly expectedChecksum?: string },
  ): { readonly path: string; readonly checksum: string; readonly bytesWritten: number };
  read(path: string): unknown;
  checksumForPath(path: string): string;
}

export interface DocumentGatewayClock {
  now(): string;
}
