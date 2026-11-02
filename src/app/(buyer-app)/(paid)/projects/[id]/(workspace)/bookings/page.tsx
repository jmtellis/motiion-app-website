import { redirect } from "next/navigation";
export default async function LegacyProjectBookingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/projects/${encodeURIComponent(id)}/coordination`);
}
