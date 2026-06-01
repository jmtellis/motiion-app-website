import type { NonTalentSubtype, TalentSubtype } from "@/types/database";
import type { SearchProfileRecord } from "@/types/search";

export const portraitWallImages = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=800&q=80",
];

export const talentSubtypeOptions: Array<{ value: TalentSubtype; label: string }> = [
  { value: "dancer", label: "Dancer" },
  { value: "choreographer", label: "Choreographer" },
];

export const nonTalentSubtypeOptions: Array<{ value: NonTalentSubtype; label: string }> = [
  { value: "casting_director", label: "Casting Director" },
  { value: "creative_director", label: "Creative Director" },
  { value: "producer", label: "Producer" },
  { value: "manager", label: "Manager" },
  { value: "agency", label: "Agency" },
  { value: "recruiter", label: "Recruiter" },
  { value: "other", label: "Other" },
];

export const styleOptions = [
  "Contemporary",
  "Hip-Hop",
  "Commercial",
  "Ballet",
  "Jazz",
  "Heels",
  "Latin",
  "Movement Direction",
];

export const mockTalentProfiles: SearchProfileRecord[] = [
  {
    id: "8bc945a2-85b8-4d07-8ad2-b6345ec50e01",
    username: "ari_miles",
    full_name: "Ari Miles",
    display_name: "Ari Miles",
    headshot_url: portraitWallImages[0],
    headshot_urls: [portraitWallImages[0]],
    location: "Los Angeles, CA",
    talent_types: ["dancer"],
    styles: ["Contemporary", "Commercial", "Jazz"],
    skills: ["Partnering", "Improvisation", "On-camera"],
    profile_highlights: [{ title: "Touring Artist", subtitle: "International pop tour" }],
    bio: "Commercial and concert dancer with a strong contemporary base and polished on-camera presence.",
    representation: "Movement House",
  },
  {
    id: "8bc945a2-85b8-4d07-8ad2-b6345ec50e02",
    username: "niko_lane",
    full_name: "Niko Lane",
    display_name: "Niko Lane",
    headshot_url: portraitWallImages[1],
    headshot_urls: [portraitWallImages[1]],
    location: "New York, NY",
    talent_types: ["choreographer"],
    styles: ["Hip-Hop", "Commercial", "Movement Direction"],
    skills: ["Creative Direction", "Staging", "Casting Support"],
    profile_highlights: [{ title: "Award Show Staging", subtitle: "Prime-time broadcast" }],
    bio: "Choreographer focused on commercial staging and fast-turnaround casting support.",
    representation: "Independent",
  },
];
