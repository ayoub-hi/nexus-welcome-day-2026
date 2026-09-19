"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api-client";

const OPTIONS = [
  { value: "not_started", label: "Not started", description: "Visitors see the waiting room." },
  { value: "open", label: "Open", description: "The quiz is playable." },
  { value: "ended", label: "Ended", description: "Visitors see the \"ended\" page." },
];

export default function AdminDashboard() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [osintStats, setOsintStats] = useState(null);

  const load = async () => {
    try {
      const data = await api.get("/api/admin/game-state");
      setStatus(data.status);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load status.");
    } finally {
      setLoading(false);
    }
  };

  const loadOsintStats = async () => {
    try {
      const data = await api.get("/api/admin/osint-stats");
      setOsintStats(data.challenges);
    } catch {
      // non-critical - just don't show the section
    }
  };

  useEffect(() => {
    load();
    loadOsintStats();
  }, []);

  const changeStatus = async (next) => {
    if (next === status) return;
    setUpdating(true);
    setError("");
    try {
      const data = await api.patch("/api/admin/game-state", { status: next });
      setStatus(data.status);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update status.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 sm:p-10">
      <h1 className="text-3xl font-bold mb-1">Admin</h1>
      <p className="text-zinc-400 mb-8">Control the live event status. Connected clients pick this up within ~4 seconds.</p>

      <div className="bg-[#1c1c1d] rounded-2xl p-6 mb-6 cyber-card">
        <h2 className="text-lg font-semibold mb-4">Event status</h2>

        {loading ? (
          <p className="text-zinc-400">Loading…</p>
        ) : (
          <div className="space-y-3">
            {OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => changeStatus(opt.value)}
                disabled={updating}
                className={`w-full text-left p-4 rounded-xl border-2 transition transform ${
                  status === opt.value
                    ? "border-green-500 bg-green-900/30 shadow-[0_0_28px_-8px_rgba(34,197,94,0.55)]"
                    : "border-zinc-700 hover:border-green-500 hover:bg-green-900/10 hover:-translate-y-0.5 hover:shadow-[0_12px_26px_-14px_rgba(34,197,94,0.5)]"
                } disabled:opacity-50 active:translate-y-0`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{opt.label}</span>
                  {status === opt.value && (
                    <span className="text-xs font-medium text-green-400 uppercase tracking-wide">Current</span>
                  )}
                </div>
                <p className="text-sm text-zinc-400 mt-1">{opt.description}</p>
              </button>
            ))}
          </div>
        )}

        {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
      </div>

      {osintStats && osintStats.length > 0 && (
        <div className="bg-[#1c1c1d] rounded-2xl p-6 mb-6 cyber-card">
          <h2 className="text-lg font-semibold mb-4">OSINT warm-up (pre-event)</h2>
          <div className="space-y-2">
            {osintStats.map((c) => (
              <div key={c.order} className="flex items-center justify-between text-sm border-b border-zinc-800 pb-2">
                <span className="text-zinc-300">
                  #{c.order} · <code className="text-zinc-400">{c.code}</code> · {c.points} pts
                  {!c.active && <span className="text-zinc-600"> (inactive)</span>}
                </span>
                <span className="text-zinc-400">
                  {c.redeemed} redeemed / {c.solved} solved
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-500 mt-3">
            Public link: <code className="text-zinc-400">/guvoruc3k4</code> — put this behind your event's QR
            code. It's an unlisted URL on purpose (not linked from anywhere in the app), so treat the QR code
            image itself as the thing to keep private until the event.
          </p>
        </div>
      )}

      <Link
        href="/admin/leaderboard"
        className="btn btn-solid w-full py-3"
      >
        Open leaderboard reveal
      </Link>
    </div>
  );
}
