"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useGameStatus } from "@/lib/use-game-status";

export default function Page() {
  const router = useRouter();
  const status = useGameStatus();

  // In case an admin re-opens the event after ending it (e.g. extending time).
  useEffect(() => {
    if (status === "open") router.push("/form");
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
        {/* Ended Graphic — CRT "CONNECTION TERMINATED" */}
        <div className="w-40 h-40 md:w-48 md:h-48 relative">
          <Image src="/ended-graphic.webp" alt="Connection Terminated" fill className="object-contain" />
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-white">Connection Terminated</h1>
          <p className="text-gray-400 text-sm md:text-base">Session closed. No active connection.</p>
        </div>
      </div>
    </div>
  );
}
