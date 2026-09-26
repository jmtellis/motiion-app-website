import { listProjectBookings } from "@/lib/talent-buyers/bookings";
import { ProjectBookingsPanel } from "@/components/talent-buyers/project/ProjectBookingsPanel";
export default async function BookingsPage({ params }: { params: Promise<{ id: string }> }) {
 const { id } = await params;
 const result = await listProjectBookings(id);
 return <ProjectBookingsPanel initialBookings={result.bookings} storageError={result.error} />;
}
