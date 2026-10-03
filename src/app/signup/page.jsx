"use client";
import Image from "next/image";
import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";

export default function SignupPage() {
  const router = useRouter();
  const [mode, setMode] = useState(null); // null | "register" | "login"
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleGoogle = () => {
    signIn("google", { callbackUrl: "/form" });
  };

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (mode === "register") {
        try {
          await api.post("/api/auth/register", form);
        } catch (err) {
          // If the account already exists, fall through and just try signing in with it.
          if (!(err instanceof ApiError && err.status === 409)) throw err;
        }
      }

      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (result?.error) {
        setError("Incorrect email or password.");
        return;
      }

      router.push("/form");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="relative flex items-center justify-center min-h-screen overflow-hidden p-4"
      style={{
        backgroundImage: "url(/background-pattern.webp)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Signup Card */}
      <div className="relative z-10 bg-[#0d1117] backdrop-blur-md rounded-3xl shadow-2xl p-6 sm:p-10 md:p-12 w-full max-w-md text-white border border-[#1a1a1a]">
        {/* Club Logo */}
        <div className="flex justify-center mb-6">
          <div className="bg-[#111111] p-4 sm:p-4 rounded-full shadow-lg border border-[#1a1a1a]">
            <Image
              src="/Nexus.png"
              alt="Nexus Club Logo"
              width={60}
              height={60}
              className="w-14 h-14 sm:w-16 sm:h-16"
            />
          </div>
        </div>

        {/* Header */}
        <h1 className="text-3xl sm:text-4xl font-bold text-center mb-3 bg-gradient-to-r from-red-500 to-red-700 bg-clip-text text-transparent">
          Create Account
        </h1>

        {/* Divider */}
        <div className="flex items-center my-6 sm:my-8">
          <div className="flex-1 border-t border-gray-700"></div>
          <span className="px-3 sm:px-4 text-gray-400 text-xs sm:text-sm">Sign up with</span>
          <div className="flex-1 border-t border-gray-700"></div>
        </div>

        {/* Google Sign Up Button */}
        <button
          onClick={handleGoogle}
          className="w-full bg-white hover:bg-gray-50 text-gray-700 font-semibold px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl border-2 border-gray-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-3"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span className="text-sm sm:text-base">Sign up with Google</span>
        </button>

        {/* Divider */}
        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-gray-700"></div>
          <span className="px-3 text-gray-400 text-xs sm:text-sm">or use email</span>
          <div className="flex-1 border-t border-gray-700"></div>
        </div>

        {!mode ? (
          <div className="flex gap-3">
            <button
              onClick={() => setMode("register")}
              className="flex-1 bg-red-700 hover:bg-red-800 text-white font-semibold py-3 rounded-xl transition"
            >
              Sign up
            </button>
            <button
              onClick={() => setMode("login")}
              className="flex-1 bg-transparent border-2 border-gray-600 hover:border-gray-400 text-white font-semibold py-3 rounded-xl transition"
            >
              Log in
            </button>
          </div>
        ) : (
          <form onSubmit={handleEmailSubmit} className="space-y-3">
            <input
              type="email"
              name="email"
              required
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              className="w-full px-3 py-2.5 border border-gray-600 bg-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 placeholder-gray-500 text-white"
            />
            <input
              type="password"
              name="password"
              required
              minLength={8}
              placeholder="Password (min 8 characters)"
              value={form.password}
              onChange={handleChange}
              className="w-full px-3 py-2.5 border border-gray-600 bg-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 placeholder-gray-500 text-white"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-red-700 hover:bg-red-800 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
            >
              {submitting ? "Please wait…" : mode === "register" ? "Create account" : "Log in"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode(null);
                setError("");
              }}
              className="w-full text-gray-400 text-sm hover:text-gray-200"
            >
              Back
            </button>
          </form>
        )}

        {/* Optional: Terms text */}
        <p className="text-center text-gray-400 text-xs sm:text-sm mt-6">
          By signing up, you agree to our{" "}
          <a href="#" className="text-red-400 hover:underline">
            Terms
          </a>{" "}
          and{" "}
          <a href="#" className="text-red-400 hover:underline">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
}
