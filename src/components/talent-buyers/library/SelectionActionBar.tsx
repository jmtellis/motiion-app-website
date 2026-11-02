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
        <button type="button" className="ui-button ui-button--secondary" onClick={onClear}>
          Clear
        </button>
      </div>
      <div className="library-action-bar__actions">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            className={action.danger ? "ui-button ui-button--secondary library-action-bar__danger" : "ui-button ui-button--secondary"}
            onClick={action.onClick}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
