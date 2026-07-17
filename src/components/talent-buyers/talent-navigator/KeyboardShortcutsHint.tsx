export function KeyboardShortcutsHint({ className }: { className?: string }) {
  return (
    <div
      className={`talent-navigator__hint ${className ?? ""}`}
      aria-label="Keyboard shortcuts"
    >
      <span>
        <kbd>←</kbd>
        <kbd>→</kbd> Browse
      </span>
      <span className="mx-2 text-white/20">·</span>
      <span>
        <kbd>↑</kbd>
        <kbd>↓</kbd> Category
      </span>
      <span className="mx-2 text-white/20">·</span>
      <span>
        <kbd>S</kbd> Save · <kbd>I</kbd> Invite · <kbd>C</kbd> Contact
      </span>
    </div>
  );
}
