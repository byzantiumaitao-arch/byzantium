"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { setHotkey, SignupError } from "@/lib/miners";

// Set or change the logged-in miner's Bittensor payout hotkey from the dashboard.
// Lets accounts created before this field existed add one, and lets anyone update
// it. Format-validated (off-chain) in setHotkey().
export async function updateHotkey(formData: FormData) {
  const session = getSession();
  if (session?.kind !== "miner") redirect("/login");

  const hotkey = String(formData.get("hotkey") || "");
  try {
    await setHotkey(session.minerId, hotkey);
  } catch (e) {
    const msg = e instanceof SignupError ? e.message : "Could not save your address.";
    redirect(`/m?error=${encodeURIComponent(msg)}`);
  }
  redirect("/m?saved=1");
}
