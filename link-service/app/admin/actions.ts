"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { setSocialStatus } from "@/lib/socials";

// Approve or reject a pending social verification (admin only).
export async function reviewSocial(formData: FormData) {
  const session = getSession();
  if (session?.kind !== "admin") redirect("/login?role=admin");
  const id = Number(formData.get("id"));
  const decision = formData.get("decision") === "approve" ? "verified" : "rejected";
  if (id) await setSocialStatus(id, decision);
  revalidatePath("/admin");
}
