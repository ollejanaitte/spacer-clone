import {
  useEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import {
  notifyApolloCompositionEnd,
  notifyApolloCompositionStart,
  registerApolloCompositionFlush,
} from "../compositionRegistry";

type CompositionAwareFieldProps = {
  value: string;
  onValueChange: (value: string) => void;
  onCompositionStateChange?: (composing: boolean) => void;
};

export type CompositionAwareInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "onCompositionStart" | "onCompositionEnd"
> &
  CompositionAwareFieldProps;

export type CompositionAwareTextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "value" | "onChange" | "onCompositionStart" | "onCompositionEnd"
> &
  CompositionAwareFieldProps;

function useCompositionAwareField(
  value: string,
  onValueChange: (nextValue: string) => void,
  onCompositionStateChange?: (composing: boolean) => void,
) {
  const composingRef = useRef(false);
  const pendingCommitRef = useRef<string | null>(null);
  const compositionCommittedValueRef = useRef<string | null>(null);
  const [displayValue, setDisplayValue] = useState<string | null>(null);

  useEffect(() => {
    if (!composingRef.current) {
      setDisplayValue(null);
    }
  }, [value]);

  useEffect(
    () =>
      registerApolloCompositionFlush(() => {
        if (!composingRef.current) return;
        const pending = pendingCommitRef.current ?? displayValue ?? value;
        composingRef.current = false;
        pendingCommitRef.current = null;
        setDisplayValue(null);
        notifyApolloCompositionEnd();
        onCompositionStateChange?.(false);
        if (pending !== value) {
          onValueChange(pending);
        }
      }),
    [displayValue, onCompositionStateChange, onValueChange, value],
  );

  const commitValue = (nextValue: string) => {
    if (composingRef.current) return;
    onValueChange(nextValue);
  };

  const handleCompositionStart = (nextValue: string) => {
    composingRef.current = true;
    pendingCommitRef.current = nextValue;
    setDisplayValue(nextValue);
    notifyApolloCompositionStart();
    onCompositionStateChange?.(true);
  };

  const handleCompositionEnd = (nextValue: string) => {
    composingRef.current = false;
    pendingCommitRef.current = null;
    setDisplayValue(nextValue);
    notifyApolloCompositionEnd();
    onCompositionStateChange?.(false);
    compositionCommittedValueRef.current = nextValue;
    onValueChange(nextValue);
  };

  const handleChange = (nextValue: string) => {
    pendingCommitRef.current = nextValue;
    setDisplayValue(nextValue);
    if (compositionCommittedValueRef.current === nextValue) {
      compositionCommittedValueRef.current = null;
      return;
    }
    compositionCommittedValueRef.current = null;
    commitValue(nextValue);
  };

  const handleBlur = () => {
    if (!composingRef.current) return;
    const pending = pendingCommitRef.current ?? displayValue ?? value;
    handleCompositionEnd(pending);
  };

  return {
    renderedValue: displayValue ?? value,
    handleCompositionStart,
    handleCompositionEnd,
    handleChange,
    handleBlur,
  };
}

export function CompositionAwareInput({
  value,
  onValueChange,
  onCompositionStateChange,
  onBlur,
  ...inputProps
}: CompositionAwareInputProps) {
  const field = useCompositionAwareField(value, onValueChange, onCompositionStateChange);
  return (
    <input
      {...inputProps}
      value={field.renderedValue}
      onCompositionStart={(event) => field.handleCompositionStart(event.currentTarget.value)}
      onCompositionEnd={(event) => field.handleCompositionEnd(event.currentTarget.value)}
      onChange={(event) => field.handleChange(event.currentTarget.value)}
      onBlur={(event) => {
        field.handleBlur();
        onBlur?.(event);
      }}
    />
  );
}

export function CompositionAwareTextarea({
  value,
  onValueChange,
  onCompositionStateChange,
  onBlur,
  ...textareaProps
}: CompositionAwareTextareaProps) {
  const field = useCompositionAwareField(value, onValueChange, onCompositionStateChange);
  return (
    <textarea
      {...textareaProps}
      value={field.renderedValue}
      onCompositionStart={(event) => field.handleCompositionStart(event.currentTarget.value)}
      onCompositionEnd={(event) => field.handleCompositionEnd(event.currentTarget.value)}
      onChange={(event) => field.handleChange(event.currentTarget.value)}
      onBlur={(event) => {
        field.handleBlur();
        onBlur?.(event);
      }}
    />
  );
}
