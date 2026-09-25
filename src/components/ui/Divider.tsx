type DividerProps = {
  label?: string;
  className?: string;
};

/** Hairline rule, optionally labeled — MotiionDivider analogue for web. */
export function Divider({ label, className = "" }: DividerProps) {
  if (!label) {
    return (
      <hr
        className={`border-0 border-t border-[var(--ds-border-low)] ${className}`}
        role="separator"
      />
    );
  }

  return (
    <div className={`relative py-1 ${className}`} role="separator" aria-label={label}>
      <div className="absolute inset-0 flex items-center" aria-hidden>
        <div className="w-full border-t border-[var(--ds-border-low)]" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-[var(--ds-background)] px-3 font-mono text-[10px] font-medium tracking-[0.14em] text-[var(--ds-text-disabled)] uppercase">
          {label}
        </span>
      </div>
    </div>
  );
}
