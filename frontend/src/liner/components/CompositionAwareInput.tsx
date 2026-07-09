import {
  useEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
} from "react";

export type CompositionAwareInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "onCompositionStart" | "onCompositionEnd"
> & {
  value: string;
  onValueChange: (value: string) => void;
  onCompositionStateChange?: (composing: boolean) => void;
};

export function CompositionAwareInput({
  value,
  onValueChange,
  onCompositionStateChange,
  ...inputProps
}: CompositionAwareInputProps) {
  const composingRef = useRef(false);
  const [displayValue, setDisplayValue] = useState<string | null>(null);

  useEffect(() => {
    if (!composingRef.current) {
      setDisplayValue(null);
    }
  }, [value]);

  return (
    <input
      {...inputProps}
      value={displayValue ?? value}
      onCompositionStart={(event) => {
        composingRef.current = true;
        setDisplayValue(event.currentTarget.value);
        onCompositionStateChange?.(true);
      }}
      onCompositionEnd={(event) => {
        const nextValue = event.currentTarget.value;
        composingRef.current = false;
        setDisplayValue(nextValue);
        onCompositionStateChange?.(false);
        onValueChange(nextValue);
      }}
      onChange={(event) => {
        const nextValue = event.currentTarget.value;
        setDisplayValue(nextValue);
        if (!composingRef.current) {
          onValueChange(nextValue);
        }
      }}
    />
  );
}
