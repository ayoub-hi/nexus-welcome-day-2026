"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Trophy } from "lucide-react";
import { api } from "@/lib/api-client";

export default function PlayedPage() {
  const router = useRouter();
  const { status } = useSession();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/");
      return;
    }
    if (status !== "authenticated") return;

    (async () => {
      try {
        const data = await api.get("/api/user/me");
        setUser(data.user);
      } finally {
        setLoading(false);
      }
    })();
  }, [status, router]);

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center relative"
      style={{
        backgroundImage: "url(/background-pattern.webp)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="relative z-10 flex flex-col items-center gap-6 px-8 py-12 bg-[#0d1117] rounded-3xl shadow-2xl max-w-md mx-4 border border-[#1a1a1a]">
        {/* Victory Graphic */}
        <div className="w-32 h-32 md:w-40 md:h-40 relative">
          <Image src="/victory-graphic.webp" alt="Mission Complete" fill className="object-contain" />
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-white">Mission Complete</h1>
          <p className="text-gray-400 text-sm md:text-base">System successfully infiltrated.</p>
        </div>

        {loading ? (
          <p className="text-gray-500 text-sm">Loading your score…</p>
        ) : (
          <div className="flex items-center gap-3 bg-[#111111] px-6 py-4 rounded-2xl border border-[#1a1a1a]">
            <Trophy className="w-8 h-8 text-yellow-400" />
            <div className="text-left">
              <p className="text-gray-500 text-xs uppercase tracking-wide">Your score</p>
              <p className="text-white text-2xl font-bold">{user?.points ?? 0} pts</p>
            </div>
          </div>
        )}

        <p className="text-gray-500 text-xs text-center max-w-xs">
          Results will be announced by the organizers at the end of the event.
        </p>
      </div>
    </div>
  );
}
