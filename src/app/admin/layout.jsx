"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function AdminLayout({ children }) {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace("/");
      return;
    }
    // session.user.isAdmin is a convenience read for UI gating only - every
    // admin API route independently re-checks this server-side (requireAdmin()
    // in lib/api-utils.js), so a stale/tampered client claim can't grant
    // real access, only a misleading redirect (which the API would then reject).
    if (!session?.user?.isAdmin) {
      router.replace("/");
    }
  }, [status, session, router]);

  if (status === "loading" || !session?.user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900 text-white">
        <p>Checking access…</p>
      </div>
    );
  }

  return <div className="min-h-screen bg-zinc-900 text-white">{children}</div>;
}
