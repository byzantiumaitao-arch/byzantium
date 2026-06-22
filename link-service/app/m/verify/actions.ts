"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { startVerification, submitProof, type Platform } from "@/lib/socials";

function platformOf(v: FormDataEntryValue | null): Platform {
  return v === "farcaster" ? "farcaster" : "x";
}

// Step 1 — record the handle and issue a code.
export async function beginVerify(formData: FormData) {
  const session = getSession();
  if (session?.kind !== "miner") redirect("/login");
  const platform = platformOf(formData.get("platform"));
  const handle = String(formData.get("handle") || "");
  if (!handle.trim()) redirect(`/m/verify?platform=${platform}`);
  await startVerification(session.minerId, platform, handle);
  redirect(`/m/verify?platform=${platform}`);
}

// Step 2 — submit the proof post URL.
export async function submitVerify(formData: FormData) {
  const session = getSession();
  if (session?.kind !== "miner") redirect("/login");
  const platform = platformOf(formData.get("platform"));
  const postUrl = String(formData.get("post_url") || "");
  const { message } = await submitProof(session.minerId, platform, postUrl);
  redirect(`/m/verify?platform=${platform}&msg=${encodeURIComponent(message)}`);
}
