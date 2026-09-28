import type { OwnerExperience } from "@/lib/app/portfolio-owner";

import {
  creditColumn,
  projectColumn,
  resumeSections,
  rolesOf,
} from "./resume-rows";

function paperDate() {
  return new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

/** HTML rendering of the size sheet PDF; scales with its container width. */
export function SizeSheetPaper({
  name,
  headshot,
  location,
  representation,
  rows,
  profileUrl,
  className = "",
}: {
  name: string;
  headshot: string | null;
  location: string | null;
  representation: string | null;
  rows: [string, string][];
  profileUrl: string;
  className?: string;
}) {
  return (
    <div className={`paper-frame ${className}`}>
      <div className="size-sheet-paper" aria-label="Size sheet preview">
        <header>
          <h3>{name}</h3>
          <span>Size Sheet</span>
        </header>
        <div className="size-sheet-paper__body">
          <div className="size-sheet-paper__side">
            {headshot ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={headshot} alt="" />
            ) : (
              <div className="size-sheet-paper__placeholder" />
            )}
            {location ? <p>{location}</p> : null}
            {representation ? <p>{representation}</p> : null}
          </div>
          <table>
            <thead>
              <tr>
                <th>Measurement</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map(([label, value]) => (
                  <tr key={label}>
                    <td>{label}</td>
                    <td>{value}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="size-sheet-paper__empty">
                    Add measurements to fill your size sheet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <footer>
          <div>
            <strong>motiion</strong>
            <span suppressHydrationWarning>{paperDate()}</span>
          </div>
          <span>{profileUrl.replace(/^https?:\/\//, "")}</span>
        </footer>
      </div>
    </div>
  );
}

/** HTML rendering of the iOS one-page resume export (centered name, stats, credit sections). */
export function ResumePaper({
  name,
  title = "Dancer",
  stats,
  experiences,
  className = "",
}: {
  name: string;
  title?: string;
  stats: string[];
  experiences: OwnerExperience[];
  className?: string;
}) {
  const sections = resumeSections(experiences).filter(
    (section) => section.items.length,
  );
  return (
    <div className={`paper-frame ${className}`}>
      <div className="resume-paper" aria-label="Resume preview">
        <header>
          <h3>{name}</h3>
          <p>{title}</p>
          {stats.length ? (
            <p className="resume-paper__stats">{stats.join("  ·  ")}</p>
          ) : null}
        </header>
        {sections.map((section) => (
          <section key={section.key}>
            <h4>{section.heading}</h4>
            {section.items.map(({ entry }) => (
              <div key={entry.id} className="resume-paper__row">
                <span>{projectColumn(entry, section.key)}</span>
                <span>{rolesOf(entry).join(", ")}</span>
                <span>{creditColumn(entry)}</span>
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
