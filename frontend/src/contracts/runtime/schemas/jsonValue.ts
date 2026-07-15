import { z } from "zod";
import type { JsonValue } from "../../jsonValue";
import { contractSchemaId, SHARED_CONTRACT_VERSION } from "../constants";
import { finiteNumberSchema } from "./primitives";

export const jsonValueSchema: z.ZodType<JsonValue> = z
  .lazy(() =>
    z.union([
      z.null(),
      z.boolean(),
      z.string(),
      finiteNumberSchema,
      z.array(jsonValueSchema),
      z.record(z.string(), jsonValueSchema),
    ]),
  )
  .meta({
    id: contractSchemaId("json-value"),
    title: "JsonValue",
    contractVersion: SHARED_CONTRACT_VERSION,
  });
