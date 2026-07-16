import { getCurrentAccount } from "@/lib/auth";
import HomeClient from "./HomeClient";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ verification?: string }> }) {
  const [account, query] = await Promise.all([getCurrentAccount(), searchParams]);
  return <HomeClient account={account ? { name: account.name, email: account.email } : null} verification={query.verification ?? null} />;
}
