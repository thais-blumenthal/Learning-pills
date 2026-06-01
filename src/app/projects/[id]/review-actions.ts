"use server";

import { redirect } from "next/navigation";
import { approvePlan, setProjectStatus } from "@/db/plan";

export async function approvePlanAction(projectId: number, keptIds: number[]) {
  await approvePlan(projectId, keptIds);
  redirect(`/projects/${projectId}`);
}

export async function reopenPlanAction(projectId: number) {
  await setProjectStatus(projectId, "review");
  redirect(`/projects/${projectId}`);
}

export async function resetToDraftAction(projectId: number) {
  await setProjectStatus(projectId, "draft");
  redirect(`/projects/${projectId}`);
}
