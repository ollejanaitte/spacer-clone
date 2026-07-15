import { z } from "zod";
import { CONTENT_CHECKSUM_ALGORITHM, SHA256_HEX_LOWERCASE_PATTERN } from "../../contentChecksum";
import { contractSchemaId, SHARED_CONTRACT_VERSION } from "../constants";

export const contentChecksumSchema = z
  .strictObject({
    algorithm: z.literal(CONTENT_CHECKSUM_ALGORITHM),
    hexDigest: z.string().regex(SHA256_HEX_LOWERCASE_PATTERN, {
      message: "hexDigest must be a 64-character lowercase hexadecimal SHA-256 digest.",
    }),
  })
  .meta({
    id: contractSchemaId("content-checksum"),
    title: "ContentChecksum",
    contractVersion: SHARED_CONTRACT_VERSION,
  });

export type ContentChecksumValue = z.infer<typeof contentChecksumSchema>;
