"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useGameStatus } from "@/lib/use-game-status";
import { sounds } from "@/lib/sounds";

export default function Page() {
  const router = useRouter();
  const status = useGameStatus();
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (status === "open") {
      if (!notifiedRef.current) {
        notifiedRef.current = true;
        sounds.start();
      }
      router.push("/form");
    } else if (status === "ended") {
      router.push("/ended");
    }
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
      <div className="relative z-10 flex flex-col items-center gap-6 px-8 py-12 bg-[#1a1c1d] rounded-3xl shadow-2xl max-w-md mx-4 text-white cyber-card brackets">
        <div className="w-28 h-28 md:w-32 md:h-32 relative bg-gradient-to-br from-gray-900 to-gray-900 rounded-full p-6 shadow-lg">
          <Image src="/Nexus.png" alt="Nexus Club Logo" fill className="object-contain p-6" />
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-white title-glow">Silence Before the Clash</h1>
          <p className="text-gray-300 text-sm md:text-base">the quiz has not started yet</p>
        </div>

        <div className="flex items-center gap-2 text-gray-400 text-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          Waiting for the organizers to start the event — this page updates automatically.
        </div>
      </div>
    </div>
  );
}
