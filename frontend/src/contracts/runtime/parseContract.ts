import type { ZodType } from "zod";
import {
  createValidationIssue,
  createValidationResult,
  hasValidationErrors,
  type ValidationResult,
} from "../validation";
import { zodIssuesToValidationResult } from "./zodIssues";

export type ContractParseSuccess<T> = {
  readonly success: true;
  readonly data: T;
  readonly validation: ValidationResult;
};

export type ContractParseFailure = {
  readonly success: false;
  readonly validation: ValidationResult;
};

export type ContractParseResult<T> = ContractParseSuccess<T> | ContractParseFailure;

export interface SemanticValidationOptions<T> {
  readonly path?: string;
  readonly semantic?: (value: T, path: string) => ValidationResult;
}

export function validContractValidationResult(): ValidationResult {
  return createValidationResult([]);
}

function sanitizeSemanticValidatorError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message.length > 0 && !message.includes("\n")) {
      return message.slice(0, 500);
    }
    return "Semantic validator failed.";
  }

  if (typeof error === "string") {
    const message = error.trim();
    if (message.length > 0 && !message.includes("\n")) {
      return message.slice(0, 500);
    }
    return "Semantic validator failed.";
  }

  return "Semantic validator failed.";
}

/**
 * Centralized structural parse via Zod `safeParse`, optionally followed by Step 0A semantic validators.
 * Never throws; structural failures short-circuit before semantic validation.
 * Semantic validator throws are converted to structured `CONTRACT_SEMANTIC_VALIDATOR_FAILURE` errors.
 */
export function parseContractValue<T>(
  schema: ZodType<T>,
  value: unknown,
  options: SemanticValidationOptions<T> = {},
): ContractParseResult<T> {
  const basePath = options.path ?? "";
  const structural = schema.safeParse(value);

  if (!structural.success) {
    return {
      success: false,
      validation: zodIssuesToValidationResult(structural.error.issues, basePath),
    };
  }

  if (options.semantic !== undefined) {
    let semanticResult: ValidationResult;
    try {
      semanticResult = options.semantic(structural.data, basePath);
    } catch (error) {
      return {
        success: false,
        validation: createValidationResult([
          createValidationIssue({
            code: "CONTRACT_SEMANTIC_VALIDATOR_FAILURE",
            severity: "error",
            message: sanitizeSemanticValidatorError(error),
            path: basePath,
          }),
        ]),
      };
    }

    if (hasValidationErrors(semanticResult)) {
      return { success: false, validation: semanticResult };
    }

    return {
      success: true,
      data: structural.data,
      validation: semanticResult,
    };
  }

  return {
    success: true,
    data: structural.data,
    validation: validContractValidationResult(),
  };
}
