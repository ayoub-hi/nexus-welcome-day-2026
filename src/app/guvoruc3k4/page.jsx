"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Copy, Check, Lock } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";

function CodePill({ order, code, points }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable - the code is still visible/selectable, so no hard failure needed
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 bg-[#232526] rounded-xl px-4 py-3">
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide">
          Challenge {order} · +{points} pts
        </p>
        <p className="font-mono text-lg text-green-400 tracking-wider">{code}</p>
      </div>
      <button
        onClick={copy}
        className="shrink-0 bg-zinc-700 hover:bg-zinc-600 rounded-lg p-2 transition"
        title="Copy code"
      >
        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default function OsintPage() {
  const [state, setState] = useState(null); // { totalChallenges, completedCount, allDone, currentChallenge, earnedCodes }
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: "error" | "wrong", message }
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const data = await api.get("/api/osint/challenge");
      setState(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load the challenge. Try refreshing.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!state?.currentChallenge || !answer.trim()) return;

    setSubmitting(true);
    setFeedback(null);
    try {
      const result = await api.post("/api/osint/submit", {
        challengeId: state.currentChallenge.id,
        answer: answer.trim(),
      });

      if (result.correct) {
        setAnswer("");
        setFeedback({ type: "correct", code: result.code, points: result.points });
        await load(); // refresh to get the next unlocked challenge (or allDone)
      } else {
        setFeedback({ type: "wrong" });
      }
    } catch (err) {
      setFeedback({ type: "error", message: err instanceof ApiError ? err.message : "Something went wrong." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4"
      style={{
        backgroundImage: "url(/vector.svg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="bg-[#1c1c1d] text-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-lg w-full">
        <div className="flex justify-center mb-4">
          <div className="bg-neutral-800 rounded-full w-16 h-16 flex items-center justify-center">
            <Image src="/Nexus.png" width={36} height={36} alt="Nexus" />
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-1">OSINT Warm-up</h1>
        <p className="text-gray-400 text-center text-sm mb-6">
          Solve all 3 to earn bonus points. Sign up afterwards to redeem your codes.
        </p>

        {error && <p className="text-red-400 text-center mb-4">{error}</p>}

        {!state ? (
          <p className="text-gray-400 text-center">Loading…</p>
        ) : (
          <>
            {state.earnedCodes.length > 0 && (
              <div className="space-y-2 mb-6">
                {state.earnedCodes.map((c) => (
                  <CodePill key={c.order} order={c.order} code={c.code} points={c.points} />
                ))}
              </div>
            )}

            {state.allDone ? (
              <div className="text-center space-y-4">
                <p className="text-green-400 font-semibold">
                  🎉 All {state.totalChallenges} challenges solved! Save your codes above.
                </p>
                <Link
                  href="/signup"
                  className="block w-full bg-green-600 hover:bg-green-700 font-semibold py-3 rounded-xl transition"
                >
                  Sign up / log in to redeem
                </Link>
              </div>
            ) : state.currentChallenge ? (
              <>
                <div className="mb-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                    Challenge {state.currentChallenge.order} of {state.totalChallenges}
                  </p>
                  <p className="text-base sm:text-lg leading-snug">{state.currentChallenge.description}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <input
                    type="text"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Your answer"
                    className="w-full px-3 py-2.5 border border-gray-500 bg-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 placeholder-gray-400 text-white"
                  />

                  {feedback?.type === "wrong" && (
                    <p className="text-red-400 text-sm">Not quite — give it another shot.</p>
                  )}
                  {feedback?.type === "error" && <p className="text-red-400 text-sm">{feedback.message}</p>}
                  {feedback?.type === "correct" && (
                    <p className="text-green-400 text-sm">Correct! +{feedback.points} pts — code above.</p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || !answer.trim()}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 font-semibold py-3 rounded-xl transition"
                  >
                    {submitting ? "Checking…" : "Submit answer"}
                  </button>
                </form>
              </>
            ) : (
              <div className="flex items-center justify-center gap-2 text-gray-400 py-8">
                <Lock className="w-5 h-5" />
                <p>No challenges are available right now.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
