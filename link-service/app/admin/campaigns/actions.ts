"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { addCampaign, setCampaignActive, CampaignError } from "@/lib/campaigns";

// Add a campaign (admin only). It becomes available to every miner immediately.
export async function createCampaign(formData: FormData) {
  const session = getSession();
  if (session?.kind !== "admin") redirect("/login?role=admin");
  try {
    await addCampaign({
      slug: String(formData.get("slug") || ""),
      name: String(formData.get("name") || ""),
      destination: String(formData.get("destination") || ""),
    });
  } catch (e) {
    const msg = e instanceof CampaignError ? e.message : "Could not add campaign.";
    redirect(`/admin/campaigns?error=${encodeURIComponent(msg)}`);
  }
  redirect("/admin/campaigns");
}

// Pause / resume a campaign. Paused campaigns drop out of miner dropdowns and
// their links fall back to the marketing site — but history is never deleted.
export async function toggleCampaign(formData: FormData) {
  const session = getSession();
  if (session?.kind !== "admin") redirect("/login?role=admin");
  await setCampaignActive(String(formData.get("slug") || ""), formData.get("active") === "true");
  revalidatePath("/admin/campaigns");
}
