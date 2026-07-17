"use client";

import Link from "next/link";

import { projectsCreateHref } from "@/lib/talent-buyers/projects-hub-constants";

type CreateProjectButtonProps = {
  onClick?: () => void;
  href?: string;
  className?: string;
};

export function CreateProjectButton({
  onClick,
  href = projectsCreateHref(),
  className = "buyer-chrome-bar__cta",
}: CreateProjectButtonProps) {
  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        Create project
      </button>
    );
  }

  return (
    <Link href={href} className={className}>
      Create project
    </Link>
  );
}
