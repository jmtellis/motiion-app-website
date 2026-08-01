"use client";

import type { ComponentType } from "react";

import type { MarketingSceneProps } from "@/components/marketing/MarketingScene";
import { BookingScene } from "@/components/marketing/scenes/BookingScene";
import { CastingScene } from "@/components/marketing/scenes/CastingScene";
import { CompareScene } from "@/components/marketing/scenes/CompareScene";
import { ProfileScene } from "@/components/marketing/scenes/ProfileScene";
import { ProjectScene } from "@/components/marketing/scenes/ProjectScene";
import { SearchScene } from "@/components/marketing/scenes/SearchScene";

export type MarketingDemoSlide = {
  id: string;
  title: string;
  description: string;
  durationMs: number;
  url: string;
  Scene: ComponentType<MarketingSceneProps>;
};

export const marketingDemoSlides: MarketingDemoSlide[] = [
  {
    id: "search",
    title: "Search verified talent instantly",
    description:
      "Find dancers using natural language, verified experience, availability, and advanced filters.",
    durationMs: 6200,
    url: "app.motiion.com/talent",
    Scene: SearchScene,
  },
  {
    id: "profile",
    title: "Review complete professional profiles",
    description:
      "Everything needed to cast with confidence—credits, reels, measurements, agencies, and availability.",
    durationMs: 6400,
    url: "app.motiion.com/talent/gabibbarra",
    Scene: ProfileScene,
  },
  {
    id: "compare",
    title: "Build your roster in seconds",
    description:
      "Organize dancers into reusable rosters for every client, campaign, artist, or production.",
    durationMs: 6400,
    url: "app.motiion.com/library",
    Scene: CompareScene,
  },
  {
    id: "project",
    title: "Create projects and cast faster",
    description:
      "Organize auditions, submissions, collaborators, files, and talent inside one collaborative workspace.",
    durationMs: 6600,
    url: "app.motiion.com/projects",
    Scene: ProjectScene,
  },
  {
    id: "casting",
    title: "Review and shortlist talent effortlessly",
    description:
      "Compare submissions, organize favorites, and make decisions with an intuitive visual workflow.",
    durationMs: 6600,
    url: "app.motiion.com/projects/summer-tour/cast",
    Scene: CastingScene,
  },
  {
    id: "booking",
    title: "Book and manage your team",
    description:
      "From selection to communication, keep every booked dancer organized in one workspace.",
    durationMs: 6800,
    url: "app.motiion.com/projects/summer-tour/cast",
    Scene: BookingScene,
  },
];
