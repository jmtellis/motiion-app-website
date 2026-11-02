import { CommunityActivitiesPage } from "@/components/app/CommunityActivitiesPage";
export const metadata = { title: "Live events | Motiion" };
export default async function EventsPage({ searchParams }: { searchParams: Promise<{ from?: string; q?: string; page?: string; week?: string }> }) {
  return <CommunityActivitiesPage kind="events" query={await searchParams} />;
}
