"use client";

export function SelectionActionBar({
  count,
  onClear,
  actions,
}: {
  count: number;
  onClear: () => void;
  actions: { label: string; onClick: () => void; danger?: boolean }[];
}) {
  if (count === 0) return null;

  return (
    <div className="library-action-bar" role="region" aria-label="Selected talent actions">
      <div className="flex items-center gap-3">
        <p className="library-action-bar__count">
          {count} selected
        </p>
        <button type="button" className="text-xs text-white/45 hover:text-white/75" onClick={onClear}>
          Clear
        </button>
      </div>
      <div className="library-action-bar__actions">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            className={action.danger ? "bd-btn-secondary text-red-200" : "bd-btn-secondary"}
            onClick={action.onClick}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
