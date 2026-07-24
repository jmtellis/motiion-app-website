"use client";

import Link from "next/link";

import { formatBuyerRelativeDate } from "@/lib/talent-buyers/dashboard-data";
import type { LibraryTalent } from "@/lib/talent-buyers/library";

export function LibraryTalentTable({
  talent,
  selected,
  onToggleSelect,
  onToggleSelectAll,
}: {
  talent: LibraryTalent[];
  selected: string[];
  onToggleSelect: (profileId: string) => void;
  onToggleSelectAll: () => void;
}) {
  const allSelected = talent.length > 0 && talent.every((person) => selected.includes(person.profileId));
  const someSelected = talent.some((person) => selected.includes(person.profileId));

  return (
    <div className="library-talent-table">
      <table>
        <thead>
          <tr>
            <th className="library-talent-table__check">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(node) => {
                  if (node) node.indeterminate = someSelected && !allSelected;
                }}
                onChange={onToggleSelectAll}
                aria-label="Select all talent"
              />
            </th>
            <th>Talent</th>
            <th>Location</th>
            <th>Styles</th>
            <th>Saved</th>
          </tr>
        </thead>
        <tbody>
          {talent.map((person) => {
            const href = person.slug ? `/talent/${person.slug}` : `/talent/${person.profileId}`;
            const isSelected = selected.includes(person.profileId);
            return (
              <tr
                key={person.profileId}
                className={isSelected ? "library-talent-table__row--selected" : undefined}
              >
                <td className="library-talent-table__check">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(person.profileId)}
                    aria-label={`Select ${person.name}`}
                  />
                </td>
                <td>
                  <Link href={href} className="library-talent-table__person">
                    {person.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={person.avatarUrl} alt="" className="library-talent-table__avatar" />
                    ) : (
                      <span className="library-talent-table__avatar library-talent-table__avatar--fallback">
                        {person.name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span className="library-talent-table__name">{person.name}</span>
                  </Link>
                </td>
                <td className="library-talent-table__muted">
                  {person.location || "Location unavailable"}
                </td>
                <td className="library-talent-table__muted">
                  {person.styles.length ? person.styles.slice(0, 3).join(", ") : "—"}
                </td>
                <td className="library-talent-table__muted">
                  {formatBuyerRelativeDate(person.addedAt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
