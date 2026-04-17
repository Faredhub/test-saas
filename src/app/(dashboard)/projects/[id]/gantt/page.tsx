import { notFound } from "next/navigation";
import { getGanttData } from "@/lib/actions/projects";
import { GanttClient } from "./gantt-client";

export const metadata = { title: "Gantt Chart" };

export default async function GanttPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const data = await getGanttData(id);
    return <GanttClient data={data} />;
  } catch {
    notFound();
  }
}
