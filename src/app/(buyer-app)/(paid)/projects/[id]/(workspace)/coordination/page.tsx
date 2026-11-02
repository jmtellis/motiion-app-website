import { listProjectConfirmations } from "@/lib/talent-buyers/confirmations";
import { ProjectConfirmationsPanel } from "@/components/talent-buyers/project/ProjectConfirmationsPanel";
import { listProjectCoordination } from "@/lib/talent-buyers/coordination";
import { ProjectCoordinationPanel } from "@/components/talent-buyers/project/ProjectCoordinationPanel";
export default async function ProjectCoordinationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [result, confirmations] = await Promise.all([listProjectCoordination(id), listProjectConfirmations(id)]);
  return <div className="w-full overflow-y-auto"><ProjectConfirmationsPanel key={`confirmations:${id}`} data={confirmations} /><ProjectCoordinationPanel key={`notes:${id}`} initialRecords={result.records} storageError={result.error} /></div>;
}
