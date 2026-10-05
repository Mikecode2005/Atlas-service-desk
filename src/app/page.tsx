import { Board } from "@/components/Board";
import { prisma } from "@/lib/db";
import { loadBoard } from "@/lib/service";

export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await loadBoard(prisma);
  return <Board data={data} />;
}
