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
          <h1 className="text-3xl md:text-4xl font-bold text-white title-glow">Ended!</h1>
          <p className="text-gray-300 text-sm md:text-base">the quiz time has ended</p>
        </div>
      </div>
    </div>
  );
}
