import { Users } from "lucide-react";

export function CollectionPreviewCollage({
  avatars,
  totalCount,
  name,
}: {
  avatars: string[];
  totalCount: number;
  name: string;
}) {
  if (totalCount === 0) {
    return (
      <div className="library-collage library-collage--empty" aria-hidden>
        <Users className="size-6 opacity-70" />
        <span>No talent added yet</span>
      </div>
    );
  }

  // 1 person → full cover; 2 → split; 3+ → 2×2 grid of four cells.
  const layout: 1 | 2 | 4 = totalCount === 1 ? 1 : totalCount === 2 ? 2 : 4;
  const cellCount = layout === 4 ? 4 : layout;
  const urls = avatars.filter(Boolean).slice(0, cellCount);
  const cells = Array.from({ length: cellCount }, (_, index) => urls[index] ?? null);
  const remaining = Math.max(0, totalCount - urls.length);

  return (
    <div className={`library-collage library-collage--${layout}`} aria-hidden>
      {cells.map((url, index) => {
        const isLast = index === cellCount - 1;
        const showMore = isLast && remaining > 0 && layout === 4;
        return (
          <div key={`${name}-${index}`} className="library-collage__cell">
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt="" className="library-collage__img" />
            ) : (
              <div className="library-collage__fallback">{name.slice(0, 1).toUpperCase()}</div>
            )}
            {showMore ? <div className="library-collage__more">+{remaining}</div> : null}
          </div>
        );
      })}
    </div>
  );
}
