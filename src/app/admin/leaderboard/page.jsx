"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Trophy, Medal, Award, Eye, RotateCcw } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";

export default function LeaderboardReveal() {
  const [players, setPlayers] = useState(null); // null = not loaded yet
  const [error, setError] = useState("");
  const [revealedCount, setRevealedCount] = useState(0);

  const load = async () => {
    setError("");
    try {
      const data = await api.get("/api/admin/scoreboard");
      setPlayers(data.players); // already sorted desc by points - rank 1 first
      setRevealedCount(0);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load the leaderboard.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Reveal order runs worst -> best, so the winner is always revealed last.
  const revealOrder = useMemo(() => (players ? [...players].reverse() : []), [players]);
  const revealedIds = useMemo(
    () => new Set(revealOrder.slice(0, revealedCount).map((p) => p.id)),
    [revealOrder, revealedCount]
  );

  const total = players?.length ?? 0;
  const done = revealedCount >= total && total > 0;

  const rankIcon = (rank) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-400 shrink-0" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-300 shrink-0" />;
    if (rank === 3) return <Award className="w-5 h-5 text-orange-400 shrink-0" />;
    return null;
  };

  return (
    <div className="max-w-2xl mx-auto p-6 sm:p-10">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-3xl font-bold">Leaderboard reveal</h1>
        <Link href="/admin" className="link-glow text-sm text-zinc-400">
          ← Back to admin
        </Link>
      </div>
      <p className="text-zinc-400 mb-8">
        Reveals from last place up to the winner. The list is snapshotted on load — refresh the page for a fresh
        pull if scores changed since.
      </p>

      {error && <p className="text-red-400 mb-4">{error}</p>}

      {!players ? (
        <p className="text-zinc-400">Loading…</p>
      ) : players.length === 0 ? (
        <p className="text-zinc-400">No one has played yet.</p>
      ) : (
        <>
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setRevealedCount((c) => Math.min(c + 1, total))}
              disabled={done}
              className="btn btn-solid flex-1 py-3"
            >
              <Eye className="w-5 h-5" />
              {done ? "All revealed" : revealedCount === 0 ? "Reveal last place" : "Reveal next"}
            </button>
            <button
              onClick={() => setRevealedCount(total)}
              disabled={done}
              className="btn btn-muted px-4 py-3"
            >
              Reveal all
            </button>
            <button
              onClick={() => setRevealedCount(0)}
              className="btn btn-muted px-4 py-3"
              title="Reset reveal (doesn't refetch scores)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <ol className="space-y-2">
            {players.map((player, index) => {
              const rank = index + 1;
              const revealed = revealedIds.has(player.id);
              return (
                <li
                  key={player.id}
                  className={`flex items-center gap-3 p-4 rounded-xl border transition-all duration-300 ${
                    revealed
                      ? rank <= 3
                        ? "border-green-500/60 bg-green-900/20"
                        : "border-zinc-700 bg-zinc-800/50"
                      : "border-zinc-800 bg-zinc-900"
                  }`}
                >
                  <span className="w-8 text-center font-bold text-zinc-400">#{rank}</span>
                  {revealed ? rankIcon(rank) : null}
                  <div className="flex-1 min-w-0">
                    {revealed ? (
                      <>
                        <p className="font-semibold truncate">{player.username || player.name}</p>
                        <p className="text-xs text-zinc-400 uppercase">{player.year || "—"}</p>
                      </>
                    ) : (
                      <p className="font-semibold text-zinc-600 tracking-widest">? ? ?</p>
                    )}
                  </div>
                  <span className={`font-bold ${revealed ? "text-green-400" : "text-zinc-700"}`}>
                    {revealed ? player.points.toLocaleString() : "—"}
                  </span>
                </li>
              );
            })}
          </ol>

          <p className="text-center text-zinc-500 text-sm mt-6">
            {revealedCount} / {total} revealed
          </p>
        </>
      )}
    </div>
  );
}
