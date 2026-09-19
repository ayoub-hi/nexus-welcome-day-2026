"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Trophy, Medal, Award, Crown, Eye, EyeOff, RotateCcw } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { sounds } from "@/lib/sounds";

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export default function LeaderboardReveal() {
  const [players, setPlayers] = useState(null); // null = not loaded yet
  const [error, setError] = useState("");
  const [revealedIds, setRevealedIds] = useState(() => new Set());
  const [lastRevealedId, setLastRevealedId] = useState(null);
  const [burstAll, setBurstAll] = useState(false);
  const [top3Running, setTop3Running] = useState(false);
  const runRef = useRef(0);

  const load = async () => {
    setError("");
    try {
      const data = await api.get("/api/admin/scoreboard");
      setPlayers(data.players); // already sorted desc by points - rank 1 first
      setRevealedIds(new Set());
      setLastRevealedId(null);
      setTop3Running(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load the leaderboard.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const total = players?.length ?? 0;

  // top three (ranks 1, 2, 3) and their reveal order: worst podium first
  const top3 = useMemo(() => (players ? players.slice(0, 3) : []), [players]);
  const top3Order = useMemo(() => [...top3].reverse(), [top3]);

  // "reveal next" climbs worst -> best so the winner is always last
  const revealOrder = useMemo(() => (players ? [...players].reverse() : []), [players]);
  const nextToReveal = revealOrder.find((p) => !revealedIds.has(p.id));
  const done = total > 0 && revealedIds.size >= total;

  const cancelRun = () => {
    runRef.current += 1;
    setTop3Running(false);
  };

  const reveal = (id) => {
    const idx = players?.findIndex((p) => p.id === id);
    if (idx == null || idx < 0) return;
    const rank = idx + 1;
    if (rank === 1) {
      sounds.champion();
    } else {
      sounds.reveal(rank);
    }
    setLastRevealedId(id);
    setRevealedIds((s) => new Set(s).add(id));
  };

  const revealNext = () => {
    if (nextToReveal) reveal(nextToReveal.id);
  };

  const revealAll = () => {
    if (!players) return;
    cancelRun();
    setRevealedIds(new Set(players.map((p) => p.id)));
    setBurstAll(true);
    sounds.champion();
    setTimeout(() => setBurstAll(false), 1000);
  };

  const reset = () => {
    cancelRun();
    setRevealedIds(new Set());
    setLastRevealedId(null);
  };

  // sequentially reveal 3rd, 2nd, 1st with escalating sounds
  const startTop3 = async () => {
    if (!players || players.length === 0 || top3Running) return;
    setTop3Running(true);
    setRevealedIds(new Set());
    setLastRevealedId(null);

    const run = ++runRef.current;

    for (let i = 0; i < top3Order.length; i++) {
      if (runRef.current !== run) return; // cancelled / reset mid-run
      await delay(900);
      if (runRef.current !== run) return;
      const p = top3Order[i];
      const rank = players.findIndex((x) => x.id === p.id) + 1;
      rank === 1 ? sounds.champion() : sounds.reveal(rank);
      setLastRevealedId(p.id);
      setRevealedIds((s) => new Set(s).add(p.id));
    }

    if (runRef.current === run) setTop3Running(false);
  };

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
        Click any row to reveal that player, crawl up from last place, or hit{" "}
        <span className="text-green-400 font-semibold">Top 3</span> for a podium reveal with sound.
      </p>

      {error && <p className="text-red-400 mb-4">{error}</p>}

      {!players ? (
        <p className="text-zinc-400">Loading…</p>
      ) : players.length === 0 ? (
        <p className="text-zinc-400">No one has played yet.</p>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <button
              onClick={revealNext}
              disabled={done || top3Running}
              className="btn btn-outline flex-1 py-3"
            >
              <Eye className="w-5 h-5" />
              {done ? "All revealed" : revealedIds.size === 0 ? "Reveal last place" : "Reveal next"}
            </button>
            <button
              onClick={startTop3}
              disabled={top3Running || players.length === 0}
              className="btn btn-solid flex-1 py-3"
            >
              <Crown className="w-5 h-5" />
              {top3Running ? "Revealing…" : "Top 3 — podium reveal"}
            </button>
            <button
              onClick={revealAll}
              disabled={done || top3Running}
              className="btn btn-muted px-4 py-3"
            >
              Reveal all
            </button>
            <button
              onClick={reset}
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
              const justRevealed =
                player.id === lastRevealedId || (burstAll && revealed);

              return (
                <li
                  key={player.id}
                  onClick={revealed || top3Running ? undefined : () => reveal(player.id)}
                  className={`flex items-center gap-3 p-4 rounded-xl border transition-all duration-300 ${
                    justRevealed ? "reveal-pop" : ""
                  } ${
                    rank === 1 && revealed ? "champ-glow border-yellow-400/50 bg-yellow-900/10" : ""
                  } ${
                    revealed && rank !== 1
                      ? rank <= 3
                        ? "border-green-500/60 bg-green-900/20"
                        : "border-zinc-700 bg-zinc-800/50"
                      : "border-zinc-800 bg-zinc-900 cursor-pointer hover:border-green-500/50 hover:bg-zinc-800/60 hover:-translate-y-0.5 active:translate-y-0"
                  }`}
                >
                  <span className={`w-8 text-center font-bold ${revealed ? "text-zinc-300" : "text-zinc-600"}`}>
                    #{rank}
                  </span>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {revealed && rankIcon(rank)}
                    <div className="flex-1 min-w-0">
                      {revealed ? (
                        <>
                          <p className="font-semibold truncate flex items-center gap-1.5">
                            {player.username || player.name}
                            {rank === 1 && <Crown className="w-4 h-4 text-yellow-400 shrink-0" />}
                          </p>
                          <p className="text-xs text-zinc-400 uppercase">{player.year || "—"}</p>
                        </>
                      ) : (
                        <p className="font-semibold text-zinc-600 tracking-widest">? ? ?</p>
                      )}
                    </div>
                  </div>
                  {!revealed && (
                    <EyeOff className="w-4 h-4 text-zinc-700 shrink-0" />
                  )}
                  <span className={`font-bold ${revealed ? "text-green-400" : "text-zinc-700"}`}>
                    {revealed ? player.points.toLocaleString() : "· · ·"}
                  </span>
                </li>
              );
            })}
          </ol>

          <p className="text-center text-zinc-500 text-sm mt-6">
            {revealedIds.size} / {total} revealed · click a row to reveal it
          </p>
        </>
      )}
    </div>
  );
}