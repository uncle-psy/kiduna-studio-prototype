import { redirect } from "next/navigation";
import { getCurrentAccount } from "@/lib/auth";
import StudioClient from "./StudioClient";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const account = await getCurrentAccount();
  if (!account) redirect("/");
  return <StudioClient account={account} />;
}
