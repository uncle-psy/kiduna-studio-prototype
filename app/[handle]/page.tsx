import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentAccount } from "@/lib/auth";
import PersonalPageClient from "./PersonalPageClient";

export const dynamic = "force-dynamic";

export default async function PersonalPage({ params }: { params: Promise<{ handle: string }> }) {
  const [account, route, requestHeaders] = await Promise.all([getCurrentAccount(), params, headers()]);
  if (!account) redirect("/");
  if (route.handle.toLowerCase() !== account.handle) redirect(`/${account.handle}`);
  const ua = requestHeaders.get("user-agent")?.toLowerCase() ?? "";
  const device = /iphone|ipad/.test(ua) ? "iphone" : /android/.test(ua) ? "android" : /macintosh|mac os/.test(ua) ? "mac" : /windows/.test(ua) ? "windows" : "web";
  return <PersonalPageClient initialDevice={device} account={{ name: account.name, handle: account.handle, email: account.email, personas: account.personas }} />;
}
