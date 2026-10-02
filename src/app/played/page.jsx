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
        backgroundImage: "url(/vector.svg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="relative z-10 flex flex-col items-center gap-6 px-8 py-12 bg-[#1a1c1d] rounded-3xl shadow-2xl max-w-md mx-4 cyber-card brackets">
        <div className="w-28 h-28 md:w-32 md:h-32 relative bg-gradient-to-br from-gray-900 to-gray-900 rounded-full p-6 shadow-lg">
          <Image src="/Nexus.png" alt="Nexus Club Logo" fill className="object-contain p-6" />
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-white title-glow">You're all set!</h1>
          <p className="text-gray-300 text-sm md:text-base">Thanks for playing the quiz.</p>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Loading your score…</p>
        ) : (
          <div className="flex items-center gap-3 bg-[#232526] px-6 py-4 rounded-2xl">
            <Trophy className="w-8 h-8 text-yellow-400" />
            <div className="text-left">
              <p className="text-gray-400 text-xs uppercase tracking-wide">Your score</p>
              <p className="text-white text-2xl font-bold">{user?.points ?? 0} pts</p>
            </div>
          </div>
        )}

        <p className="text-gray-400 text-xs text-center max-w-xs">
          Results will be announced by the organizers at the end of the event.
        </p>
      </div>
    </div>
  );
}
