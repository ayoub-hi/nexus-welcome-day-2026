"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Clock, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { api, ApiError } from "@/lib/api-client";
import { useGameStatus } from "@/lib/use-game-status";

function progressKey(attemptId) {
  return `quizProgress:${attemptId}`;
}

const CyberQuizApp = () => {
  const router = useRouter();

  const [phase, setPhase] = useState("loading"); // loading | intro | playing | submitting | error
  const [error, setError] = useState("");

  const [attemptId, setAttemptId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [expiresAt, setExpiresAt] = useState(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [questionId]: "A" }
  const [selected, setSelected] = useState(null); // this question's pick, for the highlight
  const [timeLeft, setTimeLeft] = useState(0);

  const submittingRef = useRef(false);
  const gameStatus = useGameStatus();

  // --- Fetch (or resume) the attempt on mount -----------------------------
  useEffect(() => {
    if (gameStatus === null) return; // still waiting on the first status poll

    if (gameStatus === "not_started") {
      router.replace("/notstarted");
      return;
    }
    if (gameStatus === "ended") {
      router.replace("/ended");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const data = await api.post("/api/quiz/start");
        if (cancelled) return;

        setAttemptId(data.attemptId);
        setQuestions(data.questions);
        setExpiresAt(new Date(data.expiresAt).getTime());

        // Resume local progress (which question we're on / picks so far) if
        // this is the same attempt as before a refresh. This is just UX -
        // the server doesn't trust any of it for scoring.
        try {
          const saved = JSON.parse(localStorage.getItem(progressKey(data.attemptId)) || "null");
          if (saved) {
            setCurrentIndex(saved.currentIndex || 0);
            setAnswers(saved.answers || {});
          }
        } catch {
          // ignore malformed local state
        }

        setPhase("intro");
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 403) {
          router.replace("/played");
          return;
        }
        setError(err instanceof ApiError ? err.message : "Couldn't load the quiz. Please refresh.");
        setPhase("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, gameStatus]);

  // --- Submit -------------------------------------------------------------
  const submit = useCallback(
    async (finalAnswers) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setPhase("submitting");

      try {
        await api.post("/api/quiz/submit", { answers: finalAnswers });
        if (attemptId) localStorage.removeItem(progressKey(attemptId));
        router.push("/played");
      } catch (err) {
        // Already submitted (e.g. double-fire) - just move on, /played will show the real score.
        if (err instanceof ApiError && err.status === 409) {
          if (attemptId) localStorage.removeItem(progressKey(attemptId));
          router.push("/played");
          return;
        }
        setError(err instanceof ApiError ? err.message : "Couldn't submit your answers. Retrying...");
        submittingRef.current = false;
        // brief retry rather than stranding the user
        setTimeout(() => submit(finalAnswers), 1500);
      }
    },
    [attemptId, router]
  );

  // --- Timer, driven by the server's expiresAt, not a local countdown -----
  useEffect(() => {
    if (phase !== "playing" || !expiresAt) return;

    const tick = () => {
      const remaining = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        submit(answers);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, expiresAt]);

  const startQuiz = () => setPhase("playing");

  const persistProgress = (nextIndex, nextAnswers) => {
    if (!attemptId) return;
    localStorage.setItem(
      progressKey(attemptId),
      JSON.stringify({ currentIndex: nextIndex, answers: nextAnswers })
    );
  };

  const handleAnswerSelect = (letter) => {
    if (selected) return;
    setSelected(letter);

    const currentQuestion = questions[currentIndex];
    const nextAnswers = { ...answers, [currentQuestion.id]: letter };
    setAnswers(nextAnswers);
    persistProgress(currentIndex, nextAnswers);

    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex);
        setSelected(nextAnswers[questions[nextIndex]?.id] || null);
        persistProgress(nextIndex, nextAnswers);
      } else {
        submit(nextAnswers);
      }
    }, 500);
  };

  // --- Render ---------------------------------------------------------------
  if (phase === "loading" || phase === "submitting") {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0a0a0a] text-white">
        <p className="text-lg">{phase === "submitting" ? "Submitting your answers..." : "Loading quiz..."}</p>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0a0a0a] text-white p-4">
        <div className="bg-[#0d1117] rounded-2xl p-8 max-w-md text-center border border-[#1a1a1a]">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-700 hover:bg-red-800 px-5 py-2.5 rounded-lg font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <div
        className="h-screen flex items-center justify-center p-3 sm:p-4 overflow-hidden"
        style={{
          backgroundImage: "url(/background-pattern.webp)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="bg-[#0d1117] rounded-xl sm:rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full text-center max-h-[95vh] overflow-y-auto text-white border border-[#1a1a1a]">
          <div className="bg-[#111111] rounded-full w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center mx-auto mb-4 sm:mb-6 border border-[#1a1a1a]">
            <Image src="/Nexus.png" width={48} height={48} alt="nexus" className="w-10 h-10 sm:w-12 sm:h-12" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">System Infiltration Test</h2>
          <p className="text-sm sm:text-base text-gray-400 mb-5 sm:mb-6">
            Test your knowledge with {questions.length} questions.
            <br />
            The timer starts the moment you click start, and keeps running even if you leave the page.
          </p>
          <button
            onClick={startQuiz}
            className="w-full bg-red-700 hover:bg-red-800 text-white font-semibold py-3 sm:py-4 px-5 sm:px-6 rounded-lg transition flex items-center justify-center gap-2 text-base sm:text-lg"
          >
            <Play className="w-5 h-5 sm:w-6 sm:h-6" />
            Start Quiz
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div
      className="h-screen flex items-center justify-center p-3 sm:p-4 overflow-hidden"
      style={{
        backgroundImage: "url(/background-pattern.webp)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="bg-[#0d1117] text-white rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 max-w-2xl w-full max-h-[95vh] overflow-y-auto border border-[#1a1a1a]">
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <div className="text-xs sm:text-sm font-semibold text-gray-300">
            Question {currentIndex + 1}/{questions.length}
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Clock className={`w-4 h-4 sm:w-5 sm:h-5 ${timeLeft <= 30 ? "text-red-500" : "text-red-400"}`} />
            <span className={`text-lg sm:text-2xl font-bold ${timeLeft <= 30 ? "text-red-500 animate-pulse" : "text-red-400"}`}>
              {minutes}:{seconds.toString().padStart(2, "0")}
            </span>
          </div>
        </div>

        <div className="w-full bg-gray-800 rounded-full h-1.5 sm:h-2 mb-4 sm:mb-6">
          <div
            className="bg-red-600 h-1.5 sm:h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>

        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-4 sm:mb-6 leading-snug">
          {currentQuestion.question}
        </h2>

        <div className="space-y-2 sm:space-y-3">
          {Object.entries(currentQuestion.options).map(([key, value]) => {
            const isSelected = selected === key;
            let buttonClass = "w-full text-left p-3 sm:p-4 rounded-lg border-2 transition-all ";
            buttonClass += isSelected
              ? "border-red-500 bg-red-900/40"
              : "border-gray-700 hover:border-red-400 hover:bg-gray-800/50";

            return (
              <button
                key={key}
                onClick={() => handleAnswerSelect(key)}
                disabled={!!selected}
                className={buttonClass}
              >
                <div className="flex items-start sm:items-center gap-2 sm:gap-3">
                  <span className="font-bold text-red-500 text-sm sm:text-base flex-shrink-0">{key}.</span>
                  <span className="text-white text-sm sm:text-base text-left">{value}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CyberQuizApp;
