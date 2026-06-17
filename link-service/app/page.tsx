import { redirect } from "next/navigation";

// The bare root sends visitors to the public campaign overview.
export default function Home() {
  redirect("/dashboard");
}
