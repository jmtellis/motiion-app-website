import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

export function AuthCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`ui-card mx-auto w-full ${className}`}
    >
      {children}
    </div>
  );
}

export function AuthCardHeader({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-4 border-b border-[var(--line)] px-6 py-6 md:px-8 ${className}`}>
      {children}
    </div>
  );
}

export function AuthCardContent({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`space-y-6 px-6 py-6 md:px-8 ${className}`}>{children}</div>;
}

export function AuthCardTitle({ children }: { children: ReactNode }) {
  return <h1 className="text-2xl font-semibold tracking-tight text-[var(--ink)]">{children}</h1>;
}

export function AuthField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function AuthInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={className} {...props} />;
}

export function AuthTextArea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`min-h-28 w-full rounded-[var(--radius-field)] border border-[var(--line)] bg-[var(--surface-card)] px-3 py-3 text-sm text-[var(--ink)] outline-none transition placeholder:text-[#5a5a5a] focus:border-white/30 focus:shadow-none ${className}`}
      {...props}
    />
  );
}

type AuthButtonVariant = "primary" | "secondary" | "ghost";

export function AuthButton({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: AuthButtonVariant }) {
  const base =
    variant === "primary"
      ? "btn-primary"
      : variant === "secondary"
        ? "btn-outline"
        : "inline-flex items-center justify-center rounded-[var(--radius-button)] px-4 py-2 text-sm font-semibold text-[var(--ink-soft)] transition hover:text-[var(--ink)] disabled:opacity-50";

  return (
    <button type="button" className={`${base} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function AuthError({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-field)] border border-[rgb(240_68_56_/_0.4)] bg-[rgb(240_68_56_/_0.1)] px-4 py-3 text-sm text-[#f97066]">
      {children}
    </div>
  );
}

export function AuthMuted({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-sm text-[var(--ink-soft)] ${className}`}>{children}</p>;
}

export function authChoiceCard(selected: boolean) {
  return selected
    ? "rounded-[var(--radius-card)] border border-[rgb(45_212_191_/_0.45)] bg-[#0c2a26] p-4 text-left transition"
    : "rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface-card)] p-4 text-left transition hover:border-[#3a3a3a] hover:bg-[#1e1e1e]";
}

export function authPill(selected: boolean) {
  return selected
    ? "rounded-full border border-[rgb(45_212_191_/_0.45)] bg-[#0c2a26] px-4 py-2 text-sm font-medium text-[#2dd4bf]"
    : "rounded-full border border-[var(--line)] bg-[var(--surface-card)] px-4 py-2 text-sm text-[var(--ink-soft)] transition hover:border-[#3a3a3a]";
}
