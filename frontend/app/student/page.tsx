"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { Quiz } from "@/types/quiz";
import QuizQuestion from "@/components/QuizQuestion";
import ScoreCard from "@/components/ScoreCard";

type Phase = "loading" | "waiting" | "welcome" | "quiz" | "done" | "denied";
type TabKey = "active" | "history";

const TIMER_SECONDS = 30;

interface StudentHistory {
  quiz_uuid: string;
  score: number;
  total: number;
  timestamp: string;
}

const tabs: { key: TabKey; label: string; icon: string }[] = [
  { key: "active", label: "Active Quiz", icon: "🎯" },
  { key: "history", label: "My Results", icon: "📊" },
];

export default function StudentPage() {
  const router = useRouter();
  
  // App State
  const [activeTab, setActiveTab] = useState<TabKey>("active");
  const [studentName, setStudentName] = useState("");
  const [history, setHistory] = useState<StudentHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Quiz State
  const [phase, setPhase] = useState<Phase>("loading");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
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
        
        // 1. Check active quiz
        const quizRes = await fetch(`${API_URL}/active-quiz`);
        if (!quizRes.ok) {
          setPhase("waiting");
          return;
        }
        
        const parsed: Quiz = await quizRes.json();
        setQuiz(parsed);
        setUserAnswers(new Array(parsed.questions.length).fill(""));

        // 2. Check registration status
        const checkRes = await fetch(`${API_URL}/student/check`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (checkRes.status === 401) {
          localStorage.removeItem("student_token");
          router.push("/student/login");
          return;
        }

        if (checkRes.status === 403 || checkRes.status === 404) {
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

  // Fetch History
  useEffect(() => {
    if (activeTab === "history") {
      const fetchHistory = async () => {
        setHistoryLoading(true);
        try {
          const token = localStorage.getItem("student_token");
          const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
          const res = await fetch(`${API_URL}/student/history`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setHistory(data.history || []);
          }
        } catch {
          // ignore
        } finally {
          setHistoryLoading(false);
        }
      };
      fetchHistory();
    }
  }, [activeTab]);

  // Timers cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
  }, []);

  // Timer logic for quiz
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

  // Auto-advance
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
    if (quiz) setPhase("quiz");
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
      // Ignore
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

  // Timer SVG logic
  const getTimerColor = (): string => {
    if (timeLeft > 15) return "text-[var(--accent-green)]";
    if (timeLeft > 5) return "text-[var(--accent-amber)]";
    return "text-[var(--accent-red)]";
  };
  const timerSize = 48;
  const timerStroke = 4;
  const timerRadius = (timerSize - timerStroke) / 2;
  const timerCircumference = 2 * Math.PI * timerRadius;
  const timerOffset = timerCircumference - (timeLeft / TIMER_SECONDS) * timerCircumference;
  const getTimerStrokeColor = (): string => {
    if (timeLeft > 15) return "var(--accent-green)";
    if (timeLeft > 5) return "var(--accent-amber)";
    return "var(--accent-red)";
  };

  if (phase === "loading") {
    return <main className="min-h-screen bg-bg-base" />;
  }

  // --- Render Active Quiz Phase ---
  const renderActiveQuiz = () => {
    if (phase === "waiting") {
      return (
        <div className="flex h-full flex-col items-center justify-center">
          <motion.div
            className="flex flex-col items-center gap-6 text-center max-w-md w-full"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)] text-4xl border border-[var(--border)]">
              ⏳
            </div>
            <h2 className="font-heading text-2xl font-bold text-white">
              No Quiz Active
            </h2>
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
        </div>
      );
    }

    if (phase === "denied") {
      return (
        <div className="flex h-full flex-col items-center justify-center">
          <motion.div
            className="edu-card-solid flex flex-col items-center gap-6 text-center max-w-md w-full"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[rgba(239,68,68,0.15)] text-[var(--accent-red)] text-4xl border border-[var(--accent-red)]">
              ⛔
            </div>
            <h2 className="font-heading text-2xl font-bold text-white">
              Access Denied
            </h2>
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
        </div>
      );
    }

    if (phase === "welcome" && quiz) {
      return (
        <div className="flex h-full flex-col items-center justify-center">
          <motion.div
            className="w-full max-w-md mx-auto"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="edu-card-solid flex flex-col items-center gap-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(16,185,129,0.15)] border border-[var(--accent-green)] text-3xl">
                🎯
              </div>
              <div>
                <h2 className="font-heading text-2xl font-bold text-white">
                  {quiz.title}
                </h2>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {quiz.questions.length} questions · {TIMER_SECONDS}s per
                  question
                </p>
              </div>
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
        </div>
      );
    }

    if (phase === "done" && quiz) {
      return (
        <div className="flex h-full items-center justify-center">
          <motion.div
            className="w-full max-w-2xl mx-auto"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
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
        </div>
      );
    }

    if (phase === "quiz" && quiz) {
      const totalQuestions = quiz.questions.length;
      const currentQuestion = quiz.questions[currentIndex];
      const progressPercent = ((currentIndex + (selectedAnswer ? 1 : 0)) / totalQuestions) * 100;

      return (
        <div className="flex h-full flex-col items-center pb-20">
          <div className="w-full max-w-2xl mx-auto mt-8">
            <motion.div
              className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="font-heading text-lg font-bold text-white truncate max-w-full sm:max-w-[70%]">
                {quiz.title}
              </h1>
              <span className="text-sm text-[var(--text-secondary)] truncate">
                Taking as {studentName}
              </span>
            </motion.div>

            <div className="mb-6 flex items-center gap-4">
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
                <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${getTimerColor()}`}>
                  {timeLeft}
                </span>
              </div>
              <div className="flex-1">
                <div className="mb-2 flex items-center justify-between text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  <span>Q {currentIndex + 1} / {totalQuestions}</span>
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

            <AnimatePresence>
              {timeLeft === 0 && selectedAnswer === null && (
                <motion.div
                  className="mb-4 flex items-center gap-2 rounded-lg border border-[var(--accent-red)] bg-[rgba(239,68,68,0.1)] px-4 py-3 text-sm font-medium text-[var(--accent-red)]"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <span>⏰</span>
                  Time's up! Moving to next question...
                </motion.div>
              )}
            </AnimatePresence>

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

            {selectedAnswer && (
              <motion.div
                className="mt-6 flex justify-end"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <button
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
        </div>
      );
    }
  };

  const renderHistory = () => {
    return (
      <div className="flex flex-col gap-6 max-w-4xl mx-auto mt-4">
        <h2 className="text-xl font-bold text-white mb-2">My Past Results</h2>
        
        {historyLoading ? (
          <div className="flex items-center justify-center p-12">
            <svg className="h-8 w-8 animate-spin text-accent-blue" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
            </svg>
          </div>
        ) : history.length === 0 ? (
          <div className="edu-card-solid text-center py-12">
            <span className="text-4xl block mb-4">📭</span>
            <h3 className="text-lg font-medium text-white">No history yet</h3>
            <p className="text-[var(--text-secondary)] mt-2">Take your first quiz to see your results here.</p>
          </div>
        ) : (
          <div className="edu-card-solid overflow-hidden !p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-[var(--text-secondary)]">
                <thead className="bg-[var(--bg-base)] text-xs uppercase text-[var(--text-muted)]">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Quiz Title / ID</th>
                    <th className="px-6 py-4 font-semibold text-center">Score</th>
                    <th className="px-6 py-4 font-semibold text-right">Date Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {history.map((r, i) => {
                    const pct = Math.round((r.score / r.total) * 100);
                    return (
                      <motion.tr 
                        key={i}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="hover:bg-[var(--bg-base)] transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-medium text-white">Past Quiz</span>
                          <span className="block text-xs opacity-60 font-mono mt-1">{r.quiz_uuid.split('-')[0]}...</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 font-bold ${
                            pct >= 80 ? "bg-accent-green/10 text-accent-green" :
                            pct >= 60 ? "bg-accent-amber/10 text-accent-amber" :
                            "bg-accent-red/10 text-accent-red"
                          }`}>
                            {r.score} / {r.total} ({pct}%)
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {new Date(r.timestamp).toLocaleString()}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-bg-dark text-text-primary overflow-hidden">
      {/* ── Sidebar ── */}
      <motion.div
        className="w-64 flex-shrink-0 flex flex-col border-r border-border bg-bg-elevated hidden md:flex"
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <div className="p-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-pulse">⚡</span>
            <div>
              <h1 className="text-xl font-bold tracking-wider uppercase font-heading text-transparent bg-clip-text bg-[var(--gradient-brand)] drop-shadow-[0_0_10px_rgba(124,58,237,0.5)]">Nexus</h1>
              <p className="text-xs text-accent-green font-medium mt-1">Student Dashboard</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-accent-blue/10 text-accent-blue"
                    : "text-text-secondary hover:bg-bg-base hover:text-text-primary"
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-text-secondary hover:text-accent-red hover:bg-accent-red/10 transition-colors"
          >
            <span className="text-lg">🚪</span>
            Log Out
          </button>
        </div>
      </motion.div>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Mobile Header */}
        <header className="md:hidden h-16 border-b border-border bg-bg-dark/50 backdrop-blur-md flex items-center justify-between px-4 z-10 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎓</span>
            <h1 className="font-bold text-text-primary">Student</h1>
          </div>
          <div className="flex gap-2">
             <button
              onClick={() => setActiveTab(activeTab === "active" ? "history" : "active")}
              className="text-xs bg-bg-elevated px-3 py-1 rounded text-text-secondary"
            >
              {activeTab === "active" ? "History" : "Active Quiz"}
            </button>
            <button onClick={handleLogout} className="text-xs text-accent-red px-2">Logout</button>
          </div>
        </header>

        {/* Dynamic Welcome Animation */}
        <div className="absolute top-4 right-6 md:top-6 md:right-8 z-20 pointer-events-none hidden md:block">
          <motion.div
            initial={{ opacity: 0, scale: 1.5, x: "-40vw", y: "40vh" }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            transition={{ duration: 1.2, delay: 0.2, type: "spring", stiffness: 60 }}
            className="bg-bg-elevated/80 backdrop-blur-md border border-border px-4 py-2 rounded-full shadow-lg flex items-center gap-2"
          >
            <span className="text-lg">👋</span>
            <span className="text-sm font-semibold text-white">Hi, {studentName}</span>
          </motion.div>
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          {activeTab === "active" ? renderActiveQuiz() : renderHistory()}
        </main>
      </div>
    </div>
  );
}
