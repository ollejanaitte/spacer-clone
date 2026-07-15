import { z } from "zod";
import { contractSchemaId, SHARED_CONTRACT_VERSION } from "../constants";
import { CAPABILITY_STATES } from "../../capabilityBlock";

export const capabilityStateSchema = z.enum(CAPABILITY_STATES);

export const capabilityBlockSchema = z.strictObject({
  state: capabilityStateSchema,
});

export type CapabilityBlockValue = z.infer<typeof capabilityBlockSchema>;
