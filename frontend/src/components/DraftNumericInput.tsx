import { useEffect, useId, useRef, useState } from "react";
import { ja } from "../i18n/ja";
import { parseStrictNumericDraft } from "../input/parseStrictNumeric";

type DraftNumericInputProps = {
  value: number;
  onChange: (value: number) => void;
  onValidityChange?: (isInvalid: boolean) => void;
  "aria-label"?: string;
  className?: string;
};

export function DraftNumericInput({
  value,
  onChange,
  onValidityChange,
  "aria-label": ariaLabel,
  className,
}: DraftNumericInputProps) {
  const errorId = useId();
  const [draft, setDraft] = useState(() => String(value));
  const [isInvalid, setIsInvalid] = useState(false);
  const focusedRef = useRef(false);
  const lastCommittedRef = useRef(value);

  useEffect(() => {
    lastCommittedRef.current = value;
    if (!focusedRef.current) {
      setDraft(String(value));
      setIsInvalid(false);
      onValidityChange?.(false);
    }
  }, [value, onValidityChange]);

  const reportValidity = (nextInvalid: boolean) => {
    setIsInvalid(nextInvalid);
    onValidityChange?.(nextInvalid);
  };

  const handleChange = (raw: string) => {
    setDraft(raw);
    const parsed = parseStrictNumericDraft(raw);
    if (parsed.kind === "valid") {
      reportValidity(false);
      lastCommittedRef.current = parsed.value;
      onChange(parsed.value);
      return;
    }
    reportValidity(parsed.kind === "invalid");
  };

  const handleBlur = () => {
    focusedRef.current = false;
    const parsed = parseStrictNumericDraft(draft);
    if (parsed.kind === "valid") {
      setDraft(String(parsed.value));
      reportValidity(false);
      return;
    }
    setDraft(String(lastCommittedRef.current));
    reportValidity(false);
  };

  return (
    <>
      <input
        type="text"
        inputMode="decimal"
        className={className}
        aria-label={ariaLabel}
        aria-invalid={isInvalid || undefined}
        aria-errormessage={isInvalid ? errorId : undefined}
        value={draft}
        onFocus={() => {
          focusedRef.current = true;
        }}
        onChange={(event) => handleChange(event.currentTarget.value)}
        onBlur={handleBlur}
      />
      {isInvalid ? (
        <span id={errorId} className="numeric-draft-error" role="alert">
          {ja.input.numericInvalid}
        </span>
      ) : null}
    </>
  );
}
