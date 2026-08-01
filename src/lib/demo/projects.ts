import { demoDancers } from "@/lib/demo/dancers";

export type DemoProjectType =
  | "World Tour"
  | "Commercial Campaign"
  | "Award Show"
  | "Music Video"
  | "Fashion Campaign";

export type DemoProject = {
  id: string;
  title: string;
  type: DemoProjectType;
  status: "Draft" | "Live" | "Review" | "Complete";
  client: string;
  coverUrl: string;
  castingCount: number;
  talentCount: number;
};

export type DemoTimelineItem = {
  id: string;
  label: string;
  date: string;
  status: "done" | "active" | "upcoming";
};

export type DemoCollection = {
  id: string;
  name: string;
  note: string;
  dancerIds: string[];
  favorited: boolean;
};

const cover = (id: string) =>
  demoDancers.find((dancer) => dancer.id === id)?.imageUrl ?? demoDancers[0].imageUrl;

export const demoProjects: DemoProject[] = [
  {
    id: "project-summer-tour",
    title: "Summer Tour 2027",
    type: "World Tour",
    status: "Live",
    client: "Dua Lipa",
    coverUrl: cover("dancer-gabriela"),
    castingCount: 1,
    talentCount: 6,
  },
  {
    id: "project-nike",
    title: "Nike Momentum",
    type: "Commercial Campaign",
    status: "Review",
    client: "Nike",
    coverUrl: cover("dancer-jay"),
    castingCount: 2,
    talentCount: 8,
  },
  {
    id: "project-vmas",
    title: "VMAs Opening",
    type: "Award Show",
    status: "Draft",
    client: "MTV",
    coverUrl: cover("dancer-gaynor"),
    castingCount: 1,
    talentCount: 4,
  },
  {
    id: "project-mv",
    title: "Midnight Drive",
    type: "Music Video",
    status: "Live",
    client: "The Weeknd",
    coverUrl: cover("dancer-jake"),
    castingCount: 1,
    talentCount: 5,
  },
  {
    id: "project-fashion",
    title: "Spring Lookbook",
    type: "Fashion Campaign",
    status: "Draft",
    client: "Vogue",
    coverUrl: cover("dancer-monique"),
    castingCount: 1,
    talentCount: 3,
  },
];

export const summerTourProject = demoProjects[0];

export const summerTourTimeline: DemoTimelineItem[] = [
  { id: "t1", label: "Project created", date: "Mar 2", status: "done" },
  { id: "t2", label: "Casting brief locked", date: "Mar 4", status: "done" },
  { id: "t3", label: "Talent suggested", date: "Mar 5", status: "active" },
  { id: "t4", label: "Callbacks", date: "Mar 12", status: "upcoming" },
  { id: "t5", label: "Final booking", date: "Mar 18", status: "upcoming" },
];

export const demoCollections: DemoCollection[] = [
  {
    id: "col-tour-favorites",
    name: "Female Tour Favorites",
    note: "Primary ensemble looks for summer dates",
    dancerIds: ["dancer-gabriela", "dancer-gaynor", "dancer-natsuki", "dancer-monique"],
    favorited: true,
  },
  {
    id: "col-commercial",
    name: "Commercial Talent",
    note: "Camera-ready commercial dancers",
    dancerIds: ["dancer-jay", "dancer-jake", "dancer-nathan"],
    favorited: false,
  },
  {
    id: "col-hiphop",
    name: "Hip Hop Team",
    note: "Strong groove + stage presence",
    dancerIds: ["dancer-gabriela", "dancer-jay", "dancer-jake", "dancer-rithiely"],
    favorited: true,
  },
  {
    id: "col-award",
    name: "Award Show Dancers",
    note: "Precision + camera timing",
    dancerIds: ["dancer-gaynor", "dancer-monique", "dancer-nathan"],
    favorited: false,
  },
  {
    id: "col-festival",
    name: "Festival Talent",
    note: "High-energy outdoor sets",
    dancerIds: ["dancer-jake", "dancer-natsuki", "dancer-rithiely"],
    favorited: false,
  },
];

export function dancersForCollection(collection: DemoCollection) {
  return collection.dancerIds
    .map((id) => demoDancers.find((dancer) => dancer.id === id))
    .filter((dancer): dancer is NonNullable<typeof dancer> => Boolean(dancer));
}
