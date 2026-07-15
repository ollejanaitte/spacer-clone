import type { TransferRecord } from "../transferRecord";
import { parseTransferRecordValue } from "../runtime";
import {
  assertAppendOnlyRecordRepository,
  createAppendOnlyRecordRepository,
  type AppendOnlyRecordRepository,
  type AppendOnlyRecordValidateOutcome,
} from "./appendOnlyRecordRepository";
import type { RepositoryFaultInjection } from "./faultInjection";

export type TransferRecordRepository = AppendOnlyRecordRepository<TransferRecord>;

function validateTransferRecord(value: unknown): AppendOnlyRecordValidateOutcome<TransferRecord> {
  const parsed = parseTransferRecordValue(value);
  if (!parsed.success) {
    return { ok: false, validation: parsed.validation };
  }
  return { ok: true, value: parsed.data };
}

export function createTransferRecordRepository(
  options: { readonly faultInjection?: RepositoryFaultInjection } = {},
): TransferRecordRepository {
  const repository = createAppendOnlyRecordRepository({
    resourceKind: "TransferRecord",
    validate: validateTransferRecord,
    faultInjection: options.faultInjection,
  });
  assertAppendOnlyRecordRepository(repository);
  return repository;
}

export function createInMemoryTransferRecordRepository(
  options: { readonly faultInjection?: RepositoryFaultInjection } = {},
): TransferRecordRepository {
  return createTransferRecordRepository(options);
}
