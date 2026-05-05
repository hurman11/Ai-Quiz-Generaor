"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { Quiz } from "@/types/quiz";
import QuizQuestion from "@/components/QuizQuestion";
import ScoreCard from "@/components/ScoreCard";

type Phase = "loading" | "waiting" | "welcome" | "quiz" | "done" | "denied";

const TIMER_SECONDS = 30;

export default function StudentPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  
  const [studentName, setStudentName] = useState("");

  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoAdvanceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const initialize = async () => {
      const token = localStorage.getItem("student_token");
      const sName = localStorage.getItem("student_name");
      
      if (!token || !sName) {
        router.push("/student/login");
        return;
      }
      setStudentName(sName);

      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        
        // 1. Check if there's an active quiz
        const quizRes = await fetch(`${API_URL}/active-quiz`);
        if (!quizRes.ok) {
          setPhase("waiting");
          return;
        }
        
        const parsed: Quiz = await quizRes.json();
        setQuiz(parsed);
        setUserAnswers(new Array(parsed.questions.length).fill(""));

        // 2. Check registration/completion status with JWT
        const checkRes = await fetch(`${API_URL}/student/check`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        
        if (checkRes.status === 401) {
          // Token expired or invalid
          localStorage.removeItem("student_token");
          router.push("/student/login");
          return;
        }

        if (checkRes.status === 403 || checkRes.status === 404) {
          // If 403, completed. If 404, no active quiz found somehow
          setPhase(checkRes.status === 403 ? "denied" : "waiting");
        } else if (checkRes.ok) {
          const data = await checkRes.json();
          if (data.status === "completed") {
            setPhase("denied");
          } else {
            setPhase("welcome");
          }
        } else {
          setPhase("waiting");
        }
      } catch {
        setPhase("waiting");
      }
    };
    initialize();
  }, [router]);

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
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    setTimeLeft(TIMER_SECONDS);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
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
      autoAdvanceRef.current = setTimeout(() => {
        if (currentIndex + 1 >= quiz.questions.length) {
          completeQuiz();
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
    if (quiz) {
      setPhase("quiz");
    }
  };

  const completeQuiz = async () => {
    const finalScore = userAnswers.reduce((acc, ans, idx) => {
      return acc + (ans === quiz?.questions[idx]?.correct ? 1 : 0);
    }, 0);

    try {
      const token = localStorage.getItem("student_token");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      await fetch(`${API_URL}/submit-result`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ 
          score: finalScore,
          total: quiz?.questions.length || 0
        }),
      });
    } catch {
      // Ignore errors on complete
    }
    setPhase("done");
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
      completeQuiz();
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

  const handleLogout = () => {
    localStorage.removeItem("student_token");
    localStorage.removeItem("student_name");
    router.push("/student/login");
  };

  const getTimerColor = (): string => {
    if (timeLeft > 15) return "text-[var(--accent-green)]";
    if (timeLeft > 5) return "text-[var(--accent-amber)]";
    return "text-[var(--accent-red)]";
  };

  const timerSize = 48;
  const timerStroke = 4;
  const timerRadius = (timerSize - timerStroke) / 2;
  const timerCircumference = 2 * Math.PI * timerRadius;
  const timerOffset =
    timerCircumference - (timeLeft / TIMER_SECONDS) * timerCircumference;

  const getTimerStrokeColor = (): string => {
    if (timeLeft > 15) return "var(--accent-green)";
    if (timeLeft > 5) return "var(--accent-amber)";
    return "var(--accent-red)";
  };

  if (phase === "loading") {
    return <main className="min-h-screen bg-bg-base" />;
  }

  // ── WAITING SCREEN ──
  if (phase === "waiting") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center page-container">
        <header className="absolute top-0 w-full p-4 flex justify-end">
          <button onClick={handleLogout} className="text-sm text-[var(--text-secondary)] hover:text-white transition">Sign Out</button>
        </header>
        <motion.div
          className="flex flex-col items-center gap-6 text-center max-w-md w-full"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)] text-4xl border border-[var(--border)]">
            ⏳
          </div>
          <h1 className="font-heading text-2xl font-bold text-white">
            No Quiz Active
          </h1>
          <p className="text-[var(--text-secondary)]">
            Please wait for your teacher to create and share a quiz. Once it's ready, refresh this page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary w-full max-w-[200px]"
          >
            Refresh
          </button>
        </motion.div>
      </main>
    );
  }

  // ── ACCESS DENIED SCREEN ──
  if (phase === "denied") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center page-container">
        <header className="absolute top-0 w-full p-4 flex justify-end">
          <button onClick={handleLogout} className="text-sm text-[var(--text-secondary)] hover:text-white transition">Sign Out</button>
        </header>
        <motion.div
          className="edu-card-solid flex flex-col items-center gap-6 text-center max-w-md w-full"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[rgba(239,68,68,0.15)] text-[var(--accent-red)] text-4xl border border-[var(--accent-red)]">
            ⛔
          </div>
          <h1 className="font-heading text-2xl font-bold text-white">
            Access Denied
          </h1>
          <p className="text-[var(--text-secondary)]">
            You have already completed the current active quiz. Multiple attempts are not permitted.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary w-full"
          >
            Check for new quizzes
          </button>
        </motion.div>
      </main>
    );
  }

  // ── WELCOME SCREEN (Dashboard) ──
  if (phase === "welcome" && quiz) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center page-container">
        <header className="absolute top-0 w-full p-4 flex justify-between items-center">
          <span className="font-semibold text-white">Hi, {studentName}</span>
          <button onClick={handleLogout} className="text-sm text-[var(--text-secondary)] hover:text-white transition">Sign Out</button>
        </header>
        <motion.div
          className="w-full max-w-md mx-auto"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="edu-card-solid flex flex-col items-center gap-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(16,185,129,0.15)] border border-[var(--accent-green)] text-3xl">
              🎯
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold text-white">
                {quiz.title}
              </h1>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                {quiz.questions.length} questions · {TIMER_SECONDS}s per
                question
              </p>
            </div>

            {/* Timer info */}
            <div className="flex items-center gap-2 rounded-lg bg-[rgba(245,158,11,0.1)] border border-[var(--accent-amber)] px-4 py-3 text-sm text-[var(--accent-amber)] w-full text-left">
              <span className="text-xl">⏱️</span>
              <span>
                You have <strong>{TIMER_SECONDS} seconds</strong> per question. Unanswered questions will be skipped automatically.
              </span>
            </div>

            <button
              id="start-quiz-btn"
              onClick={handleStartQuiz}
              className="btn-primary w-full min-h-[52px]"
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
      <main className="flex min-h-screen items-center justify-center page-container">
        <motion.div
          className="w-full max-w-2xl mx-auto"
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
            onBackHome={() => window.location.reload()}
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
      <main className="flex min-h-screen flex-col items-center page-container pb-20">
        <div className="w-full max-w-2xl mx-auto">
          {/* ── Header ── */}
          <motion.div
            className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h1 className="font-heading text-lg font-bold text-white truncate max-w-full sm:max-w-[70%]">
              {quiz.title}
            </h1>
            <span className="text-sm text-[var(--text-secondary)] truncate">
              Taking as {studentName}
            </span>
          </motion.div>

          {/* ── Timer + Progress Row ── */}
          <div className="mb-6 flex items-center gap-4">
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
                  stroke="var(--bg-elevated)"
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
              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                <span>
                  Q {currentIndex + 1} / {totalQuestions}
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
                className="mb-4 flex items-center gap-2 rounded-lg border border-[var(--accent-red)] bg-[rgba(239,68,68,0.1)] px-4 py-3 text-sm font-medium text-[var(--accent-red)]"
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

          {/* ── Next Button ── */}
          {selectedAnswer && (
            <motion.div
              className="mt-6 flex justify-end"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <button
                id="quiz-next-btn"
                type="button"
                onClick={handleNext}
                className="btn-primary w-full sm:w-auto px-8 min-h-[52px]"
              >
                {currentIndex + 1 >= totalQuestions
                  ? "Finish Quiz →"
                  : "Next Question →"}
              </button>
            </motion.div>
          )}
        </div>
      </main>
    );
  }

  return null;
}
