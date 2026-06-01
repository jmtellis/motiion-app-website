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
      className={`mx-auto w-full rounded-2xl border border-[var(--line)] bg-white shadow-[0_16px_48px_rgba(17,17,17,0.08)] ${className}`}
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
      className={`min-h-28 w-full rounded-[0.85rem] border border-[var(--line)] bg-white px-3 py-3 text-sm text-[var(--ink)] outline-none transition placeholder:text-[#8b8a86] focus:border-[color-mix(in_oklab,var(--accent),white_35%)] focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--accent),white_84%)] ${className}`}
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
        : "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold text-[var(--ink-soft)] transition hover:text-[var(--ink)] disabled:opacity-50";

  return (
    <button type="button" className={`${base} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function AuthError({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
      {children}
    </div>
  );
}

export function AuthMuted({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-sm text-[var(--ink-soft)] ${className}`}>{children}</p>;
}

export function authChoiceCard(selected: boolean) {
  return selected
    ? "rounded-2xl border border-[var(--accent-dark)] bg-[color-mix(in_oklab,var(--accent),white_88%)] p-5 text-left transition"
    : "rounded-2xl border border-[var(--line)] bg-white p-5 text-left transition hover:border-[#d6d4ce] hover:bg-[#fefefe]";
}

export function authPill(selected: boolean) {
  return selected
    ? "rounded-full border border-[var(--accent-dark)] bg-[color-mix(in_oklab,var(--accent),white_84%)] px-4 py-2 text-sm font-medium text-[var(--ink)]"
    : "rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm text-[var(--ink-soft)] transition hover:border-[#d6d4ce]";
}
