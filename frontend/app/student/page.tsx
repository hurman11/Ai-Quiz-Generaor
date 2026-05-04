"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { Quiz } from "@/types/quiz";
import QuizQuestion from "@/components/QuizQuestion";
import ScoreCard from "@/components/ScoreCard";

type Phase = "waiting" | "welcome" | "quiz" | "done";

const TIMER_SECONDS = 30;

export default function StudentPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("waiting");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [studentName, setStudentName] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoAdvanceRef = useRef<NodeJS.Timeout | null>(null);

  // Check for active quiz
  useEffect(() => {
    const fetchActiveQuiz = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${API_URL}/active-quiz`);
        if (res.ok) {
          const parsed: Quiz = await res.json();
          setQuiz(parsed);
          setUserAnswers(new Array(parsed.questions.length).fill(""));
          setPhase("welcome");
        } else {
          setPhase("waiting");
        }
      } catch {
        setPhase("waiting");
      }
    };
    fetchActiveQuiz();
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
  }, []);

  // Timer logic — runs during quiz phase when no answer selected
  useEffect(() => {
    if (phase !== "quiz" || selectedAnswer !== null) {
      // Stop timer if answered or not in quiz
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Reset timer for new question
    setTimeLeft(TIMER_SECONDS);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up — clear the interval
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [phase, currentIndex, selectedAnswer]);

  // Auto-advance when timer hits 0
  useEffect(() => {
    if (timeLeft === 0 && phase === "quiz" && selectedAnswer === null && quiz) {
      // Brief pause so student sees "Time's up!" then auto-advance
      autoAdvanceRef.current = setTimeout(() => {
        if (currentIndex + 1 >= quiz.questions.length) {
          setPhase("done");
        } else {
          setCurrentIndex((prev) => prev + 1);
          setSelectedAnswer(null);
        }
      }, 1500);

      return () => {
        if (autoAdvanceRef.current) {
          clearTimeout(autoAdvanceRef.current);
          autoAdvanceRef.current = null;
        }
      };
    }
  }, [timeLeft, phase, selectedAnswer, quiz, currentIndex]);

  const handleStartQuiz = () => {
    if (studentName.trim() && quiz) {
      setPhase("quiz");
    }
  };

  const handleAnswer = (answer: string) => {
    if (selectedAnswer || timeLeft === 0) return;
    setSelectedAnswer(answer);
    const updated = [...userAnswers];
    updated[currentIndex] = answer;
    setUserAnswers(updated);
  };

  const handleNext = () => {
    if (!quiz) return;
    if (currentIndex + 1 >= quiz.questions.length) {
      setPhase("done");
    } else {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
    }
  };

  const score = quiz
    ? userAnswers.reduce((acc, ans, idx) => {
        return acc + (ans === quiz.questions[idx]?.correct ? 1 : 0);
      }, 0)
    : 0;

  // Timer color based on time remaining
  const getTimerColor = (): string => {
    if (timeLeft > 15) return "text-accent-green";
    if (timeLeft > 5) return "text-accent-amber";
    return "text-accent-red";
  };

  const getTimerBg = (): string => {
    if (timeLeft > 15) return "bg-accent-green";
    if (timeLeft > 5) return "bg-accent-amber";
    return "bg-accent-red";
  };

  // SVG timer ring
  const timerSize = 48;
  const timerStroke = 4;
  const timerRadius = (timerSize - timerStroke) / 2;
  const timerCircumference = 2 * Math.PI * timerRadius;
  const timerOffset =
    timerCircumference - (timeLeft / TIMER_SECONDS) * timerCircumference;

  const getTimerStrokeColor = (): string => {
    if (timeLeft > 15) return "#16a34a";
    if (timeLeft > 5) return "#d97706";
    return "#dc2626";
  };

  // ── WAITING SCREEN ──
  if (phase === "waiting") {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-12">
        <motion.div
          className="flex flex-col items-center gap-6 text-center max-w-md"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Classroom SVG */}
          <svg
            width="200"
            height="160"
            viewBox="0 0 200 160"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="30" y="40" width="140" height="90" rx="8" fill="#e5e7eb" />
            <rect x="40" y="50" width="120" height="60" rx="4" fill="#ffffff" />
            <rect x="50" y="60" width="100" height="6" rx="3" fill="#d1d5db" />
            <rect x="50" y="72" width="80" height="6" rx="3" fill="#d1d5db" />
            <rect x="50" y="84" width="90" height="6" rx="3" fill="#d1d5db" />
            <rect x="50" y="96" width="60" height="6" rx="3" fill="#d1d5db" />
            <rect x="80" y="130" width="40" height="10" rx="2" fill="#9ca3af" />
            <circle cx="100" cy="25" r="16" fill="#2563eb" opacity="0.15" />
            <text
              x="100"
              y="30"
              textAnchor="middle"
              fontSize="16"
              fill="#2563eb"
            >
              📋
            </text>
          </svg>

          <h1 className="font-heading text-2xl font-bold text-text-primary">
            No Quiz Active Right Now
          </h1>
          <p className="text-text-secondary">
            Please wait for your teacher to create and share a quiz. Once
            it&apos;s ready, this page will show the quiz.
          </p>
          <button
            onClick={async () => {
              try {
                const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
                const res = await fetch(`${API_URL}/active-quiz`);
                if (res.ok) {
                  const parsed: Quiz = await res.json();
                  setQuiz(parsed);
                  setUserAnswers(new Array(parsed.questions.length).fill(""));
                  setPhase("welcome");
                }
              } catch {
                /* ignore */
              }
            }}
            className="btn-outline"
          >
            Refresh
          </button>
          <button
            onClick={() => router.push("/")}
            className="text-sm text-text-secondary hover:text-accent-teal transition-colors"
          >
            ← Back to Home
          </button>
        </motion.div>
      </main>
    );
  }

  // ── WELCOME SCREEN ──
  if (phase === "welcome" && quiz) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-12">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="edu-card flex flex-col items-center gap-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-teal/10 text-3xl">
              🎯
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold text-text-primary">
                {quiz.title}
              </h1>
              <p className="mt-2 text-sm text-text-secondary">
                {quiz.questions.length} questions · {TIMER_SECONDS}s per
                question · Good luck!
              </p>
            </div>

            {/* Timer info */}
            <div className="flex items-center gap-2 rounded-lg bg-accent-amber/10 px-4 py-2 text-sm text-accent-amber">
              <span>⏱️</span>
              <span>
                You have <strong>{TIMER_SECONDS} seconds</strong> per question.
                Unanswered questions will be skipped automatically.
              </span>
            </div>

            <div className="w-full">
              <label className="mb-1.5 block text-left text-sm font-medium text-text-primary">
                Enter your full name to begin
              </label>
              <input
                id="student-name-input"
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Your full name"
                className="edu-input"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleStartQuiz();
                }}
              />
            </div>

            <button
              id="start-quiz-btn"
              onClick={handleStartQuiz}
              disabled={!studentName.trim()}
              className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Quiz →
            </button>
          </div>
        </motion.div>
      </main>
    );
  }

  // ── QUIZ DONE SCREEN ──
  if (phase === "done" && quiz) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-12">
        <motion.div
          className="w-full max-w-2xl"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <ScoreCard
            score={score}
            total={quiz.questions.length}
            questions={quiz.questions}
            userAnswers={userAnswers}
            studentName={studentName}
            onBackHome={() => router.push("/")}
          />
        </motion.div>
      </main>
    );
  }

  // ── QUIZ IN PROGRESS ──
  if (phase === "quiz" && quiz) {
    const totalQuestions = quiz.questions.length;
    const currentQuestion = quiz.questions[currentIndex];
    const progressPercent =
      ((currentIndex + (selectedAnswer ? 1 : 0)) / totalQuestions) * 100;

    return (
      <main className="flex min-h-screen flex-col items-center px-4 py-6 md:py-10">
        <div className="w-full max-w-2xl">
          {/* ── Header ── */}
          <motion.div
            className="mb-4 flex items-center justify-between"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h1 className="font-heading text-lg font-bold text-text-primary">
              {quiz.title}
            </h1>
            <span className="text-sm text-text-secondary">
              Hi, {studentName}! 👋
            </span>
          </motion.div>

          {/* ── Timer + Progress Row ── */}
          <div className="mb-2 flex items-center gap-4">
            {/* Timer Ring */}
            <div className="relative flex-shrink-0">
              <svg
                width={timerSize}
                height={timerSize}
                viewBox={`0 0 ${timerSize} ${timerSize}`}
                className="-rotate-90"
              >
                <circle
                  cx={timerSize / 2}
                  cy={timerSize / 2}
                  r={timerRadius}
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth={timerStroke}
                />
                <circle
                  cx={timerSize / 2}
                  cy={timerSize / 2}
                  r={timerRadius}
                  fill="none"
                  stroke={getTimerStrokeColor()}
                  strokeWidth={timerStroke}
                  strokeLinecap="round"
                  strokeDasharray={timerCircumference}
                  strokeDashoffset={timerOffset}
                  style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s ease" }}
                />
              </svg>
              <span
                className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${getTimerColor()}`}
              >
                {timeLeft}
              </span>
            </div>

            {/* Progress Info */}
            <div className="flex-1">
              <div className="mb-1 flex items-center justify-between text-xs text-text-secondary">
                <span>
                  Question {currentIndex + 1} of {totalQuestions}
                </span>
                <span>{Math.round(progressPercent)}%</span>
              </div>
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* ── Time's Up Banner ── */}
          <AnimatePresence>
            {timeLeft === 0 && selectedAnswer === null && (
              <motion.div
                className="mb-4 flex items-center gap-2 rounded-lg border border-accent-red/30 bg-accent-red/10 px-4 py-3 text-sm font-medium text-accent-red"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <span>⏰</span>
                Time&apos;s up! Moving to next question...
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Question ── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <QuizQuestion
                question={currentQuestion}
                onAnswer={handleAnswer}
                answered={selectedAnswer !== null || timeLeft === 0}
                selectedAnswer={selectedAnswer}
              />
            </motion.div>
          </AnimatePresence>

          {/* ── Next Button (only when answered, not on timeout) ── */}
          {selectedAnswer && (
            <motion.div
              className="mt-5 flex justify-end"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <button
                id="quiz-next-btn"
                type="button"
                onClick={handleNext}
                className="btn-primary px-8 py-2.5"
              >
                {currentIndex + 1 >= totalQuestions
                  ? "View Results"
                  : "Next →"}
              </button>
            </motion.div>
          )}
        </div>
      </main>
    );
  }

  return null;
}
