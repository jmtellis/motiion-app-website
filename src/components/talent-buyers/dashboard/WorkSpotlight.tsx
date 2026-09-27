import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, FilePenLine } from "lucide-react";
import type { ProjectHubSummary } from "@/lib/talent-buyers/projects-hub";

/** One clear focal point, followed by actual work the user can continue. */
export function WorkSpotlight({ projects }: { projects: ProjectHubSummary[] }) {
  const featured =
    [...projects]
      .filter((p) => p.status === "active" && p.projectType === "casting")
      .sort((a, b) => b.talentCount - a.talentCount)[0] ??
    projects.find((p) => p.status === "active") ??
    projects[0];
  if (!featured) return null;
  const isCasting =
    featured.projectType === "casting" && featured.workKind !== "activity";
  const next = [
    ...projects.filter((p) => p.status === "draft"),
    ...projects.filter((p) => p.status !== "draft"),
  ]
    .filter((p) => p.id !== featured.id)
    .slice(0, 3);
  const href = isCasting
    ? `/projects/${featured.id}/workspace/review`
    : (featured.href ?? `/projects/${featured.id}`);
  return (
    <section className="studio-focus-layout" aria-label="Work to focus on">
      <article className="studio-spotlight">
        <div className="studio-spotlight__image">
          {featured.coverImageUrl && (
            <Image
              src={featured.coverImageUrl}
              alt=""
              fill
              sizes="(max-width: 760px) 100vw, 50vw"
              priority
            />
          )}
        </div>
        <div className="studio-spotlight__shade" />
        <div className="studio-spotlight__content">
          <span className="studio-kicker">
            {isCasting ? "In the casting room" : "In focus"}
          </span>
          <h2>{featured.title}</h2>
          <p>
            {isCasting
              ? `${featured.talentCount} applications · ${featured.roles.length} roles`
              : `${featured.workTypeLabel ?? "Project"} · Active`}
          </p>
          <Link href={href} className="studio-spotlight__action">
            {isCasting ? "Review talent" : "Open workspace"}
            <ArrowRight size={16} />
          </Link>
        </div>
        {featured.rosterPreview.length > 0 && (
          <div
            className="studio-spotlight__people"
            aria-label={`${featured.rosterCount} people in the roster`}
          >
            <div className="studio-avatars">
              {featured.rosterPreview.slice(0, 3).map((person) => (
                <span key={person.id}>
                  {person.headshotUrl ? (
                    <Image
                      src={person.headshotUrl}
                      alt={person.displayName}
                      fill
                      sizes="32px"
                    />
                  ) : (
                    person.displayName.slice(0, 1)
                  )}
                </span>
              ))}
            </div>
            <span>{featured.rosterCount} on the roster</span>
          </div>
        )}
      </article>
      <aside className="studio-next">
        <div className="studio-next__heading">
          <h2>Pick up where you left off</h2>
          <span>{next.length} workspaces</span>
        </div>
        {next.map((project) => (
          <Link
            className="studio-next__item"
            href={project.href ?? `/projects/${project.id}`}
            key={project.id}
          >
            <span className="studio-next__icon">
              <FilePenLine size={18} />
            </span>
            <span>
              <strong>{project.title}</strong>
              <small>
                {project.status === "draft"
                  ? "Continue draft"
                  : "Open workspace"}
              </small>
            </span>
            <ArrowUpRight size={16} />
          </Link>
        ))}
        <p className="studio-next__note">Your work, ready when you are.</p>
      </aside>
    </section>
  );
}
