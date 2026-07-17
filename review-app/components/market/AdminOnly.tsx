"use client";

import { useMarketRole } from "@/hooks/useMarketRole";

/**
 * Renders children only when the current user has admin-level access
 * (sponsor or admin role) to the active market.
 *
 * Usage:
 *   <AdminOnly>
 *     <Button>＋ New proposal</Button>
 *   </AdminOnly>
 *
 *   <AdminOnly fallback={<MemberBanner />}>
 *     <ProposalCreateForm />
 *   </AdminOnly>
 */
export function AdminOnly({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { isAdmin, loading } = useMarketRole();

  if (loading) return null;
  if (!isAdmin) return <>{fallback}</>;
  return <>{children}</>;
}

/**
 * Full-page gate for admin-only pages (e.g., create-start, objectives/create).
 * Shows a styled message instead of redirecting.
 */
export function AdminPageGate({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading, role } = useMarketRole();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-muted text-sm">Checking permissions…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center max-w-md space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 flex items-center justify-center mx-auto">
            <span className="text-2xl">🔒</span>
          </div>
          <h2 className="text-xl font-bold text-white">Admin Access Required</h2>
          <p className="text-sm text-muted">
            {role === "member"
              ? "As a member, you can view proposals and vote by trading. Creating and managing content requires admin access."
              : "You need to be a member of this market to access this page."}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}