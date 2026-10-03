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
  const [bonusCodes, setBonusCodes] = useState(null);

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

  const loadBonusCodes = async () => {
    try {
      const data = await api.get("/api/admin/bonus-codes");
      setBonusCodes(data.codes);
    } catch {
      // non-critical - just don't show the section
    }
  };

  useEffect(() => {
    load();
    loadBonusCodes();
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
      <p className="text-gray-500 mb-8">Control the live event status. Connected clients pick this up within ~4 seconds.</p>

      <div className="bg-[#0d1117] rounded-2xl p-6 mb-6 border border-[#1a1a1a]">
        <h2 className="text-lg font-semibold mb-4">Event status</h2>

        {loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : (
          <div className="space-y-3">
            {OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => changeStatus(opt.value)}
                disabled={updating}
                className={`w-full text-left p-4 rounded-xl border-2 transition ${
                  status === opt.value
                    ? "border-red-500 bg-red-900/30"
                    : "border-gray-700 hover:border-gray-500"
                } disabled:opacity-50`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{opt.label}</span>
                  {status === opt.value && (
                    <span className="text-xs font-medium text-red-400 uppercase tracking-wide">Current</span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">{opt.description}</p>
              </button>
            ))}
          </div>
        )}

        {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
      </div>

      {bonusCodes && bonusCodes.length > 0 && (
        <div className="bg-[#0d1117] rounded-2xl p-6 mb-6 border border-[#1a1a1a]">
          <h2 className="text-lg font-semibold mb-4">Bonus codes</h2>
          <p className="text-xs text-gray-600 mb-4">
            Hand these out however you like (Instagram, a physical event, etc.) - redeemable on /form once,
            per user, until someone starts the quiz or the event ends. Add more with{" "}
            <code className="text-gray-400">npm run code:add -- &lt;points&gt; [label]</code>.
          </p>
          <div className="space-y-2">
            {bonusCodes.map((c) => (
              <div key={c.code} className="flex items-center justify-between text-sm border-b border-gray-800 pb-2">
                <span className="text-gray-300">
                  <code className="text-gray-400">{c.code}</code> · {c.points} pts
                  {c.label && <span className="text-gray-600"> · {c.label}</span>}
                  {!c.active && <span className="text-gray-700"> (inactive)</span>}
                </span>
                <span className="text-gray-500">{c.redeemed} redeemed</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Link
        href="/admin/leaderboard"
        className="block w-full text-center bg-red-700 hover:bg-red-800 font-semibold py-3 rounded-xl transition"
      >
        Open leaderboard reveal
      </Link>
    </div>
  );
}
