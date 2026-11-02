"use client";

import { Children, cloneElement, isValidElement, useId, type InputHTMLAttributes, type ReactElement, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

type ControlProps = { "aria-label"?: string; "aria-labelledby"?: string; "aria-describedby"?: string; "aria-invalid"?: boolean | "true" | "false"; };
type FieldProps = { label: ReactNode; hint?: ReactNode; error?: ReactNode; className?: string; children: ReactNode; };

/** Label, help and validation stay associated with the control for assistive tech. */
export function Field({ label, hint, error, className = "", children }: FieldProps) {
  const labelId = useId();
  const hintId = useId();
  const errorId = useId();
  return (
    <label className={`field ui-field ${className}`}>
      <span id={labelId} className="ui-field__label">{label}</span>
      {Children.map(children, (child) => {
        if (!isValidElement<ControlProps>(child)) return child;
        if (typeof child.type === "symbol" || (typeof child.type === "string" && !["input", "select", "textarea"].includes(child.type))) return child;
        const describedBy = [child.props["aria-describedby"], hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");
        return cloneElement(child as ReactElement<ControlProps>, {
          "aria-labelledby": child.props["aria-labelledby"] ?? (child.props["aria-label"] ? undefined : labelId),
          "aria-describedby": describedBy || undefined,
          "aria-invalid": error ? true : child.props["aria-invalid"],
        });
      })}
      {hint ? <span id={hintId} className="ui-field__hint">{hint}</span> : null}
      {error ? <span id={errorId} className="ui-field__error" role="alert">{error}</span> : null}
    </label>
  );
}
export function Input(props: InputHTMLAttributes<HTMLInputElement>) { return <input {...props} />; }
export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea {...props} />; }
export function Select({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) { return <select {...props}>{children}</select>; }
