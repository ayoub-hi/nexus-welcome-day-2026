"use client";
import Image from "next/image";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

function LoadingScreen({ message }) {
  return (
    <div
      className="relative min-h-screen w-full flex items-center justify-center overflow-hidden"
      style={{
        backgroundImage: "url(/background-pattern.webp)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-transparent to-black/40 z-[1]" />
      <div className="relative z-10 flex flex-col items-center gap-8 px-4 w-full max-w-md">
        <div className="relative">
          <div className="absolute inset-0 bg-red-500/30 blur-3xl rounded-full animate-pulse" />
          <div className="relative bg-[#0d1117] backdrop-blur-sm rounded-full p-8 shadow-2xl border border-[#1a1a1a]">
            <Image
              src="/Nexus.png"
              alt="Nexus Club Logo"
              width={180}
              height={180}
              className="w-32 h-32 sm:w-44 sm:h-44 object-contain"
              priority
            />
          </div>
        </div>
        <div className="flex flex-col items-center gap-4">
          <div className="text-center space-y-2">
            <p className="text-white text-lg sm:text-xl font-semibold tracking-wide drop-shadow-lg">
              {message}
            </p>
            <div className="flex gap-1.5 justify-center">
              <span className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// NOTE: this layout deliberately does NOT gate on the live game status.
// /form (profile setup + bonus code redemption) needs to be reachable any
// time after login, including before the event opens - that's the whole
// point of "redeem your code to get points from the get-go". Only /quizz
// itself checks the game status, right before it would start an attempt.
export default function ProtectedLayout({ children }) {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();

  useEffect(() => {
    if (authStatus === "loading") return;

    if (authStatus === "unauthenticated") {
      router.replace("/");
      return;
    }

    // Server-derived (see the `session` callback in lib/auth.js), so this
    // reflects the real DB value, not something the client could edit.
    if (session?.user?.played) {
      router.replace("/played");
    }
  }, [authStatus, session, router]);

  const isReady = authStatus === "authenticated" && !session?.user?.played;

  if (!isReady) {
    return <LoadingScreen message="Verifying Access" />;
  }

  return <>{children}</>;
}
