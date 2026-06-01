import { getProject } from "@/db/projects";
import { setProjectStatus, savePlan } from "@/db/plan";
import { fetchSourceText } from "@/lib/fetch-source";
import { generatePlan } from "@/lib/generate-plan";

export async function researchProject(projectId: number): Promise<void> {
  const project = await getProject(projectId);
  if (!project) throw new Error("Project not found");

  await setProjectStatus(projectId, "researching");
  try {
    const sources = await Promise.all(
      project.sources.map(async (s) => ({ url: s.url, text: await fetchSourceText(s.url) })),
    );
    const plan = await generatePlan({
      name: project.name,
      goal: project.goal,
      sources,
    });
    await savePlan(projectId, plan);
  } catch (err) {
    await setProjectStatus(projectId, "draft");
    throw err;
  }
}
