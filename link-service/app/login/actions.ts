"use server";

import { redirect } from "next/navigation";
import { startSession, checkAdminPassword } from "@/lib/auth";
import { createMiner, authenticate, SignupError } from "@/lib/miners";

// Create a miner account, sign in, and go to the dashboard.
export async function signup(formData: FormData) {
  const handle = String(formData.get("handle") || "");
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const displayName = String(formData.get("display_name") || "");

  let minerId: number;
  try {
    const miner = await createMiner({ handle, email, password, displayName });
    minerId = miner.id;
  } catch (e) {
    const msg = e instanceof SignupError ? e.message : "Could not create account.";
    redirect(`/signup?error=${encodeURIComponent(msg)}`);
  }
  startSession({ kind: "miner", minerId });
  redirect("/m");
}

// Miner email/password login.
export async function minerLogin(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");

  const miner = await authenticate(email, password);
  if (!miner) redirect(`/login?error=${encodeURIComponent("Wrong email or password.")}`);

  startSession({ kind: "miner", minerId: miner.id });
  redirect("/m");
}

// Admin login (shared password).
export async function adminLogin(formData: FormData) {
  const password = String(formData.get("password") || "");
  if (!checkAdminPassword(password)) {
    redirect(`/login?role=admin&error=${encodeURIComponent("Incorrect password.")}`);
  }
  startSession({ kind: "admin" });
  redirect("/admin");
}
