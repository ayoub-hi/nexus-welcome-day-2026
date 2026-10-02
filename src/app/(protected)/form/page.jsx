"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { Gift, Check, AlertTriangle } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { useGameStatus } from "@/lib/use-game-status";

function RedeemCodeCard() {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [redeemed, setRedeemed] = useState([]); // [{ code, points }]

  const handleRedeem = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const result = await api.post("/api/codes/redeem", { code: code.trim() });
      setRedeemed((r) => [...r, { code: code.trim().toUpperCase(), points: result.pointsAwarded }]);
      setCode("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to redeem. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#1c1c1d] rounded-xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 max-w-md w-full text-white cyber-card">
      <div className="flex items-center gap-2 mb-3">
        <Gift className="w-5 h-5 text-green-400" />
        <h3 className="font-semibold">Got a bonus code?</h3>
      </div>
      <p className="text-sm text-gray-400 mb-3">
        If you earned a code from one of our challenges, redeem it{redeemed.length ? "s" : ""} here for bonus
        points.
      </p>

      <div className="flex items-start gap-2 bg-yellow-900/30 border border-yellow-700/50 rounded-lg px-3 py-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
        <p className="text-xs text-yellow-200">
          Redeem your codes <span className="font-semibold">before</span> you start the quiz — you won't be able
          to redeem them once you've started.
        </p>
      </div>

      <form onSubmit={handleRedeem} className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. NX-7F3K9QAB"
          className="flex-1 px-3 py-2 border border-gray-500 bg-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 placeholder-gray-400 text-white font-mono text-sm"
        />
        <button
          type="submit"
          disabled={submitting || !code.trim()}
          className="btn btn-solid px-4 py-2 text-sm"
        >
          {submitting ? "…" : "Redeem"}
        </button>
      </form>

      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

      {redeemed.length > 0 && (
        <ul className="mt-3 space-y-1">
          {redeemed.map((r, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-green-400">
              <Check className="w-4 h-4" /> {r.code} redeemed for +{r.points} pts
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ProfileForm() {
  const router = useRouter();
  const { data: session } = useSession();
  const [formData, setFormData] = useState({ username: "", year: "" });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  // Prefill username if they already have one (e.g. returning credentials user).
  useEffect(() => {
    if (session?.user?.username) {
      setFormData((f) => ({ ...f, username: session.user.username }));
    }
  }, [session]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.username.trim()) {
      errors.username = "Username is required";
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username.trim())) {
      errors.username = "Letters, numbers, and underscores only";
    }
    if (!formData.year) {
      errors.year = "Year is required";
    }
    return errors;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      await api.patch("/api/user/me", {
        username: formData.username.trim(),
        year: formData.year,
      });
      router.push("/quizz");
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Failed to submit. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#1c1c1d] rounded-xl sm:rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full text-white cyber-card">
      <div className="bg-neutral-800 rounded-full w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center mx-auto mb-4 sm:mb-6">
        <Image src="/Nexus.png" width={48} height={48} alt="nexus" className="w-10 h-10 sm:w-12 sm:h-12" />
      </div>
      <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4 text-center">Registration Form</h2>
      <p className="text-sm sm:text-base text-white mb-5 sm:mb-6 text-center">
        Please fill in your information to continue
      </p>

      <form onSubmit={handleFormSubmit} className="space-y-4 text-white">
        <div>
          <label className="block text-sm font-medium text-white mb-1">Username</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleFormChange}
            className="w-full px-3 py-2 border border-gray-500 bg-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 placeholder-gray-400 text-white"
            placeholder="Enter your username"
          />
          {formErrors.username && <p className="text-red-500 text-sm mt-1">{formErrors.username}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-1">Year</label>
          <select
            name="year"
            value={formData.year}
            onChange={handleFormChange}
            className="w-full px-3 py-2 border border-gray-500 bg-[#1c1c1d] rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 text-white [&>option]:bg-[#1c1c1d] [&>option]:text-white"
          >
            <option value="">Select your year</option>
            <option value="1cp">1CP</option>
            <option value="2cp">2CP</option>
            <option value="1cs">1CS</option>
            <option value="2cs">2CS</option>
            <option value="3cs">3CS</option>
          </select>
          {formErrors.year && <p className="text-red-500 text-sm mt-1">{formErrors.year}</p>}
        </div>

        {serverError && <p className="text-red-500 text-sm">{serverError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-solid w-full py-3 text-base sm:text-lg"
        >
          {isSubmitting ? "Submitting..." : "Submit"}
        </button>
      </form>
    </div>
  );
}

export default function FormPage() {
  const gameStatus = useGameStatus();

  return (
    <div className="min-h-screen bg-[url('/vector.svg')] bg-cover bg-center flex flex-col items-center justify-center gap-4 p-3 sm:p-4">
      {/* Redeem card is available before and during the event, but not once
          it's ended - the redemption window closes with the event. */}
      {gameStatus !== null && gameStatus !== "ended" && <RedeemCodeCard />}

      {/* Profile setup only makes sense once the quiz is actually playable. */}
      {gameStatus === "open" && <ProfileForm />}

      {gameStatus === "not_started" && (
        <p className="text-gray-400 text-sm text-center max-w-md">
          The rest of the sign-up will appear here once the event starts.
        </p>
      )}

      {gameStatus === "ended" && (
        <p className="text-gray-400 text-sm text-center max-w-md">The event has ended.</p>
      )}
    </div>
  );
}
