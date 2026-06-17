import { NextResponse } from "next/server";
import { endSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Clears the session cookie and returns to the public overview.
export async function GET(req: Request) {
  endSession();
  return NextResponse.redirect(new URL("/dashboard", req.url), 302);
}
