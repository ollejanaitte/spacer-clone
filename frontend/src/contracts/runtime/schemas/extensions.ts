import { z } from "zod";
import { EXTENSION_KEY_PATTERN } from "../../extensions";
import { immutableResourceReferenceSchema } from "./immutableResourceReference";
import { jsonValueSchema } from "./jsonValue";

export const extensionValueSchema = z
  .strictObject({
    json: jsonValueSchema.optional(),
    resourceRef: immutableResourceReferenceSchema.optional(),
  })
  .superRefine((value, context) => {
    const hasJson = value.json !== undefined;
    const hasResourceRef = value.resourceRef !== undefined;
    if (hasJson === hasResourceRef) {
      context.addIssue({
        code: "custom",
        message: "Each extension entry must provide exactly one of json or resourceRef.",
        path: [],
      });
    }
  });

export const extensionKeySchema = z.string().regex(EXTENSION_KEY_PATTERN, {
  message: "Extension keys must use a namespaced vendor/key format.",
});

export const extensionsSchema = z.record(extensionKeySchema, extensionValueSchema);

export type ExtensionValueSchemaValue = z.infer<typeof extensionValueSchema>;
export type ExtensionsValue = z.infer<typeof extensionsSchema>;
