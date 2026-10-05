import { TechnicianBoard } from "@/components/TechnicianBoard";
import { getTechnicianRequests, getStaticBoardData } from "@/lib/demo-data";

export default async function TechnicianPage({
  params,
}: {
  params: Promise<{ technicianId: string }>;
}) {
  const { technicianId } = await params;
  const boardData = getStaticBoardData();
  const requests = getTechnicianRequests(technicianId);
  
  const data = {
    ...boardData,
    requests,
  };
  
  return <TechnicianBoard data={data} technicianId={technicianId} />;
}