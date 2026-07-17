export type ClientEntityKind = "artist" | "project" | "company";

export type ClientSearchResult = {
  id: string;
  name: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  domain?: string | null;
};
