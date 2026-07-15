import type { RoadToFrameTransferPackage } from "../roadToFrameTransferPackage";
import { parseRoadToFrameTransferPackageValue } from "../runtime";
import {
  createImmutablePackageRepository,
  type ImmutablePackageRepository,
  type ImmutablePackageValidateOutcome,
  type PackageIdentity,
} from "./immutablePackageRepository";
import type { RepositoryFaultInjection } from "./faultInjection";

export type RoadToFrameTransferPackageRepository =
  ImmutablePackageRepository<RoadToFrameTransferPackage>;

export type { PackageIdentity as TransferPackageIdentity };

function validateRoadToFrameTransferPackage(
  value: unknown,
): ImmutablePackageValidateOutcome<RoadToFrameTransferPackage> {
  const parsed = parseRoadToFrameTransferPackageValue(value);
  if (!parsed.success) {
    return { ok: false, validation: parsed.validation };
  }
  return { ok: true, value: parsed.data };
}

export function createRoadToFrameTransferPackageRepository(
  options: { readonly faultInjection?: RepositoryFaultInjection } = {},
): RoadToFrameTransferPackageRepository {
  return createImmutablePackageRepository({
    resourceKind: "RoadToFrameTransferPackage",
    validate: validateRoadToFrameTransferPackage,
    faultInjection: options.faultInjection,
  });
}

export function createInMemoryRoadToFrameTransferPackageRepository(
  options: { readonly faultInjection?: RepositoryFaultInjection } = {},
): RoadToFrameTransferPackageRepository {
  return createRoadToFrameTransferPackageRepository(options);
}
