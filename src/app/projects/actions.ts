"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteProject } from "@/db/projects";

export async function deleteProjectAction(id: number) {
  await deleteProject(id);
  revalidatePath("/");
  redirect("/");
}
