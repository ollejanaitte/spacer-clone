import { useEffect, useState } from "react";
import { commitApolloNumericDraft } from "../numericInput";
import { CompositionAwareInput, type CompositionAwareInputProps } from "./CompositionAwareInput";

export type ApolloNumericInputProps = Omit<CompositionAwareInputProps, "value" | "onValueChange"> & {
  value: number;
  onCommit: (value: number) => void;
  onReject?: (message: string) => void;
};

export function ApolloNumericInput({
  value,
  onCommit,
  onReject,
  ...inputProps
}: ApolloNumericInputProps) {
  const [draft, setDraft] = useState(String(value));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(String(value));
    setError(null);
  }, [value]);

  const commitDraft = (nextDraft: string) => {
    const result = commitApolloNumericDraft(nextDraft);
    if (!result.ok) {
      setError(result.message);
      onReject?.(result.message);
      setDraft(String(value));
      return;
    }
    setError(null);
    if (result.value !== value) {
      onCommit(result.value);
    }
    setDraft(String(result.value));
  };

  return (
    <>
      <CompositionAwareInput
        {...inputProps}
        value={draft}
        inputMode="decimal"
        aria-invalid={error ? true : undefined}
        onValueChange={(nextDraft) => {
          setDraft(nextDraft);
        }}
        onBlur={(event) => {
          commitDraft(event.currentTarget.value);
          inputProps.onBlur?.(event);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            commitDraft(event.currentTarget.value);
          }
          inputProps.onKeyDown?.(event);
        }}
      />
      {error ? (
        <small className="apollo-input-error" role="alert">
          {error}
        </small>
      ) : null}
    </>
  );
}
