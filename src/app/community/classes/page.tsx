import { CommunityActivitiesPage } from "@/components/app/CommunityActivitiesPage";
export const metadata = { title: "Classes & sessions | Motiion" };
export default async function ClassesPage({ searchParams }: { searchParams: Promise<{ from?: string; q?: string; page?: string; week?: string }> }) {
  return <CommunityActivitiesPage kind="classes" query={await searchParams} />;
}
