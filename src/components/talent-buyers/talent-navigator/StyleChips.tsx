"use client";

import { useState } from "react";

const MAX_VISIBLE_STYLES = 5;

type StyleChipsProps = {
  styles: string[];
};

export function StyleChips({ styles }: StyleChipsProps) {
  const [expanded, setExpanded] = useState(false);

  if (styles.length === 0) return null;

  const hasMore = styles.length > MAX_VISIBLE_STYLES;
  const visibleStyles = expanded || !hasMore ? styles : styles.slice(0, MAX_VISIBLE_STYLES);

  return (
    <div className="talent-navigator__style-chips-list">
      {visibleStyles.map((style) => (
        <span key={style} className="talent-navigator__chip">
          {style}
        </span>
      ))}
      {!expanded && hasMore ? (
        <button
          type="button"
          className="talent-navigator__chip"
          onClick={() => setExpanded(true)}
        >
          See all
        </button>
      ) : null}
      {expanded && hasMore ? (
        <button
          type="button"
          className="talent-navigator__chip"
          onClick={() => setExpanded(false)}
        >
          Show less
        </button>
      ) : null}
    </div>
  );
}
