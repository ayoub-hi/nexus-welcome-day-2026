"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Eye, RotateCcw } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { YEARS, YEAR_LABELS } from "@/lib/years";

export default function LeaderboardReveal() {
  const [players, setPlayers] = useState(null); // null = not loaded yet
  const [error, setError] = useState("");
  const [revealedCount, setRevealedCount] = useState(0);
  const [year, setYear] = useState(YEARS[0]);

  const load = async (y = year) => {
    setError("");
    setPlayers(null);
    try {
      const data = await api.get(`/api/admin/scoreboard?year=${y}`);
      setPlayers(data.players); // already sorted desc by points - rank 1 first
      setRevealedCount(0);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load the leaderboard.");
    }
  };

  // Each year has its own board - reload whenever the selected year changes.
  useEffect(() => {
    load(year);
  }, [year]);

  // Reveal order runs worst -> best, so the winner is always revealed last.
  const revealOrder = useMemo(() => (players ? [...players].reverse() : []), [players]);
  const revealedIds = useMemo(
    () => new Set(revealOrder.slice(0, revealedCount).map((p) => p.id)),
    [revealOrder, revealedCount]
  );

  const total = players?.length ?? 0;
  const done = revealedCount >= total && total > 0;

  const rankIcon = (rank) => {
    if (rank === 1) return <Image src="/rank-1.svg" alt="1st" width={28} height={28} className="w-7 h-7 shrink-0" />;
    if (rank === 2) return <Image src="/rank-2.svg" alt="2nd" width={28} height={28} className="w-7 h-7 shrink-0" />;
    if (rank === 3) return <Image src="/rank-3.svg" alt="3rd" width={28} height={28} className="w-7 h-7 shrink-0" />;
    return null;
  };

  return (
    <div className="max-w-2xl mx-auto p-6 sm:p-10">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-3xl font-bold">Leaderboard reveal · {YEAR_LABELS[year]}</h1>
        <Link href="/admin" className="text-sm text-gray-500 hover:text-white">
          ← Back to admin
        </Link>
      </div>
      <p className="text-gray-500 mb-8">
        Reveals from last place up to the winner. The list is snapshotted on load — refresh the page for a fresh
        pull if scores changed since.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {YEARS.map((y) => (
          <button
            key={y}
            onClick={() => setYear(y)}
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition border-2 ${
              year === y
                ? "border-red-500 bg-red-900/30 text-white"
                : "border-gray-700 text-gray-500 hover:border-gray-500"
            }`}
          >
            {YEAR_LABELS[y]}
          </button>
        ))}
      </div>

      {error && <p className="text-red-400 mb-4">{error}</p>}

      {!players ? (
        <p className="text-gray-500">Loading…</p>
      ) : players.length === 0 ? (
        <p className="text-gray-500">No one from {YEAR_LABELS[year]} has played yet.</p>
      ) : (
        <>
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setRevealedCount((c) => Math.min(c + 1, total))}
              disabled={done}
              className="flex-1 bg-red-700 hover:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
            >
              <Eye className="w-5 h-5" />
              {done ? "All revealed" : revealedCount === 0 ? "Reveal last place" : "Reveal next"}
            </button>
            <button
              onClick={() => setRevealedCount(total)}
              disabled={done}
              className="px-4 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 font-semibold rounded-xl transition"
            >
              Reveal all
            </button>
            <button
              onClick={() => setRevealedCount(0)}
              className="px-4 bg-gray-800 hover:bg-gray-700 font-semibold rounded-xl transition flex items-center gap-2"
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
                        ? "border-red-500/60 bg-red-900/20"
                        : "border-gray-700 bg-gray-800/50"
                      : "border-gray-800 bg-[#0d1117]"
                  }`}
                >
                  <span className="w-8 text-center font-bold text-gray-500">#{rank}</span>
                  {revealed ? rankIcon(rank) : null}
                  <div className="flex-1 min-w-0">
                    {revealed ? (
                      <>
                        <p className="font-semibold truncate">{player.username || player.name}</p>
                        <p className="text-xs text-gray-500 uppercase">{player.year || "—"}</p>
                      </>
                    ) : (
                      <p className="font-semibold text-gray-700 tracking-widest">? ? ?</p>
                    )}
                  </div>
                  <span className={`font-bold ${revealed ? "text-red-400" : "text-gray-700"}`}>
                    {revealed ? player.points.toLocaleString() : "—"}
                  </span>
                </li>
              );
            })}
          </ol>

          <p className="text-center text-gray-600 text-sm mt-6">
            {revealedCount} / {total} revealed
          </p>
        </>
      )}
    </div>
  );
}
