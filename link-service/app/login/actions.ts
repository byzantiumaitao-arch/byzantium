"use server";

import { redirect } from "next/navigation";
import { checkPassword, startSession, type Role } from "@/lib/auth";

// Handles the login form for both roles. On success, sets the session cookie and
// sends the user to where they were headed; on failure, bounces back with ?error.
export async function login(formData: FormData) {
  const role = (formData.get("role") as Role) || "miner";
  const password = String(formData.get("password") || "");
  const miner = String(formData.get("miner") || "");
  const next = String(formData.get("next") || (role === "admin" ? "/admin" : "/m"));

  const session = checkPassword(role, password, miner);
  if (!session) {
    const back = role === "admin" ? "/login?role=admin" : "/login?role=miner";
    redirect(`${back}&error=1`);
  }

  startSession(session);
  redirect(next);
}
