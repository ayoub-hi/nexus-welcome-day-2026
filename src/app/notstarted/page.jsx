"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useGameStatus } from "@/lib/use-game-status";

export default function Page() {
  const router = useRouter();
  const status = useGameStatus();

  useEffect(() => {
    if (status === "open") {
      router.push("/form");
    } else if (status === "ended") {
      router.push("/ended");
    }
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
      <div className="relative z-10 flex flex-col items-center gap-6 px-8 py-12 bg-[#0d1117] rounded-3xl shadow-2xl max-w-md mx-4 text-white border border-[#1a1a1a]">
        {/* Waiting Screen Graphic — Terminal cursor */}
        <div className="w-40 h-40 md:w-48 md:h-48 relative">
          <Image src="/waiting-screen.webp" alt="Awaiting Connection" fill className="object-contain" />
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-white">Awaiting Connection<span className="cursor-blink">_</span></h1>
          <p className="text-gray-400 text-sm md:text-base">Standby. Waiting for signal.</p>
        </div>

        <div className="flex items-center gap-2 text-gray-500 text-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          Waiting for the organizers to start the event — this page updates automatically.
        </div>
      </div>
    </div>
  );
}
