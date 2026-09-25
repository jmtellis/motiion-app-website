import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

type FieldProps = {
  label: ReactNode;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
};

/** Labeled field shell — matches sitewide `.field` pattern. */
export function Field({ label, hint, className = "", children }: FieldProps) {
  return (
    <label className={`field ${className}`}>
      <span>{label}</span>
      {children}
      {hint ? <span className="field-hint text-xs text-[var(--ds-text-disabled)]">{hint}</span> : null}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} />;
}

export function Select({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props}>{children}</select>;
}
