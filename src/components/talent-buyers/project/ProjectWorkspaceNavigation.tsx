"use client";

import Link from "next/link";
import { useLayoutEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { CastingRoleNavigation } from "../casting/CastingRoleNavigation";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { projectDrillIn, projectWorkspaceSection, projectWorkspaceSections } from "@/lib/talent-buyers/project-workspace-navigation";
import { projectHomePath } from "@/lib/talent-buyers/project-routes";

export function ProjectWorkspaceNavigation({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [active, setActive] = useOptimistic(projectWorkspaceSection(pathname, projectId));
  const [pending, startTransition] = useTransition();
  const nav = useRef<HTMLElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  useLayoutEffect(() => {
    const element = nav.current;
    if (!element) return;
    const measure = () => {
      const link = element.querySelector<HTMLElement>('[aria-current="page"]');
      if (link) setIndicator({ left: link.offsetLeft, width: link.offsetWidth });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [active]);
  const drillIn = projectDrillIn(pathname, projectId);
  return <>
    <nav ref={nav} className="project-simple-nav" aria-label="Project workspace" aria-busy={pending}>
      {projectWorkspaceSections(projectId).map((tab) => <Link key={tab.id} href={tab.href} prefetch={true} onNavigate={(event) => { event.preventDefault(); startTransition(() => { setActive(tab.id as typeof active); router.push(tab.href); }); }} aria-current={active === tab.id ? "page" : undefined}>{tab.label}</Link>)}
      <span className="project-simple-nav__indicator" aria-hidden style={{ width: indicator.width, transform: `translateX(${indicator.left}px)` }} />
    </nav>
    {drillIn === "Casting" ? <CastingRoleNavigation /> : drillIn ? <div className="project-drill-in">
      <div className="project-drill-in__trail">
        <Link href={projectHomePath(projectId)} aria-label="Back to Manage"><ArrowLeft size={16} aria-hidden /> Manage</Link>
        <span aria-hidden>/</span><h2>{drillIn}</h2>
      </div>
    </div> : null}
  </>;
}
