import { myRequestsAction } from "@/app/actions";
import { TechnicianBoard } from "@/components/TechnicianBoard";

export const dynamic = "force-dynamic";

export default async function TechnicianPage({
  params,
}: {
  params: Promise<{ technicianId: string }>;
}) {
  const { technicianId } = await params;
  const result = await myRequestsAction(technicianId);
  if (!result.ok) {
    return (
      <main className="p-4 text-center text-crit">
        Failed to load requests: {result.error}
      </main>
    );
  }
  // result.ok guarantees data is present
  const data = result.data as import("@/lib/view").BoardData;
  return <TechnicianBoard data={data} technicianId={technicianId} />;
}