"use server";

import { redirect } from "next/navigation";
import { completePill } from "@/db/pills";

export async function completePillAction(
  conceptId: number,
  projectId: number,
  completion: "mastered" | "shaky",
) {
  await completePill(conceptId, completion);
  redirect(`/projects/${projectId}`);
}
