import { notFound } from "next/navigation";
import { getOrCreatePill, getConceptForReader } from "@/db/pills";
import { FocusReader } from "./FocusReader";

export const dynamic = "force-dynamic";

export default async function PillPage({
  params,
}: {
  params: Promise<{ id: string; conceptId: string }>;
}) {
  const { id, conceptId } = await params;
  const projectId = Number(id);
  const cId = Number(conceptId);
  if (!Number.isInteger(projectId) || !Number.isInteger(cId)) notFound();

  // generate-on-first-open (cached after); loading.tsx covers the wait
  await getOrCreatePill(cId);

  const view = await getConceptForReader(cId);
  if (!view || view.projectId !== projectId || !view.included || !view.pill) notFound();

  return (
    <FocusReader
      projectId={projectId}
      conceptId={cId}
      title={view.title}
      minutes={view.minutes}
      index={view.index}
      total={view.total}
      pill={view.pill}
      completion={view.completion}
    />
  );
}
