"use client";

import { useCurrentUser } from "@/hooks/useSession";
import { useLogout } from "@/hooks/useLogout";

export function UserPill() {
  const user = useCurrentUser();
  const logout = useLogout();

  if (!user) return null;

  const fallback = "https://storage.googleapis.com/mmosh-assets/default.png";
  const displayName = user.name ?? user.username ?? user.email;

  return (
    <div className="user-pill">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={user.picture ?? fallback} alt={displayName} />
      <div className="u-info">
        <div className="u-name">{displayName}</div>
      </div>
      <button className="logout-btn" onClick={logout} type="button">
        Sign out
      </button>
    </div>
  );
}