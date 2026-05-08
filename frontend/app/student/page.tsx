"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { Quiz } from "@/types/quiz";
import QuizQuestion from "@/components/QuizQuestion";
import ScoreCard from "@/components/ScoreCard";
import LiveStudentView from "@/components/LiveStudentView";

type Phase = "loading" | "enter_code" | "waiting" | "welcome" | "quiz" | "done" | "denied";
type TabKey = "active" | "history" | "leaderboard";

const TIMER_SECONDS = 30;

interface StudentHistory {
  quiz_uuid: string;
  score: number;
  total: number;
  timestamp: string;
}

interface LeaderboardEntry {
  student_name: string;
  score: number;
  total: number;
  time_taken?: number;
}

const tabs: { key: TabKey; label: string; icon: string }[] = [
  { key: "active", label: "Active Quiz", icon: "🎯" },
  { key: "leaderboard", label: "Leaderboard", icon: "🏆" },
  { key: "history", label: "My Results", icon: "📊" },
];

export default function StudentPage() {
  const router = useRouter();
  
  // App State
  const [activeTab, setActiveTab] = useState<TabKey>("active");
  const [studentName, setStudentName] = useState("");
  const [history, setHistory] = useState<StudentHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // Quiz State
  const [phase, setPhase] = useState<Phase>("loading");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [startTime, setStartTime] = useState<number>(0);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [liveState, setLiveState] = useState<any>(null);
  
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
        
        const parsed = await quizRes.json();
        
        // Check if quiz requires code (either explicitly or if it has a quiz_code field)
        if (parsed.requires_code || parsed.quiz_code) {
          setPhase("enter_code");
          return;
        }
        
        // Backward compatibility (if backend doesn't require code)
        setQuiz(parsed);
        setUserAnswers(new Array(parsed.questions?.length || 0).fill(""));

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

  // Fetch Leaderboard
  useEffect(() => {
    if (activeTab === "leaderboard") {
      const fetchLeaderboard = async () => {
        setLeaderboardLoading(true);
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
          const res = await fetch(`${API_URL}/results`);
          if (res.ok) {
            const data = await res.json();
            // Sort by score descending, then by time taken ascending
            const sortedResults = (data.results || []).sort((a: any, b: any) => {
              if (b.score !== a.score) return b.score - a.score;
              if (a.time_taken !== undefined && b.time_taken !== undefined) {
                return a.time_taken - b.time_taken;
              }
              return 0;
            });
            setLeaderboard(sortedResults);
          }
        } catch {
          // ignore
        } finally {
          setLeaderboardLoading(false);
        }
      };
      fetchLeaderboard();
      // Auto-refresh leaderboard every 5 seconds
      const interval = setInterval(fetchLeaderboard, 5000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  // Timers cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
  }, []);

  // Poll for Live Mode State
  useEffect(() => {
    if (!quiz || phase === "loading" || phase === "enter_code" || phase === "denied" || phase === "waiting") return;
    
    let interval: any;
    const pollQuiz = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${API_URL}/active-quiz`);
        if (res.ok) {
          const parsed = await res.json();
          if (parsed.live_state) {
             setLiveState(parsed.live_state);
             if (!quiz.live_state) {
               setQuiz(parsed);
             }
          } else {
             setLiveState(null);
          }
        }
      } catch { /* ignore */ }
    };
    
    interval = setInterval(pollQuiz, 1500);
    return () => clearInterval(interval);
  }, [quiz, phase]);

  // Timer logic for quiz (async mode)
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

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) return;
    setPinError("");
    setPhase("loading");
    
    try {
      const token = localStorage.getItem("student_token");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      const quizRes = await fetch(`${API_URL}/active-quiz?code=${pinInput.trim()}`);
      if (!quizRes.ok) {
        if (quizRes.status === 403) setPinError("Invalid Game Pin");
        else setPinError("No active quiz available");
        setPhase("enter_code");
        return;
      }
      
      let parsed: Quiz | null = null;
      try {
        parsed = await quizRes.json();
      } catch {
        setPinError("Invalid server response");
        setPhase("enter_code");
        return;
      }
      
      // If backend is old and returned full quiz without checking pin:
      if (parsed && parsed.quiz_code && parsed.quiz_code !== pinInput.trim()) {
        setPinError("Invalid Game Pin");
        setPhase("enter_code");
        return;
      }

      setQuiz(parsed);
      if (parsed?.live_state) setLiveState(parsed.live_state);
      setUserAnswers(new Array(parsed?.questions?.length || 0).fill(""));

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
      setPinError("Connection error");
      setPhase("enter_code");
    }
  };

  const handleStartQuiz = () => {
    if (quiz) {
      setPhase("quiz");
      setStartTime(Date.now());
    }
  };

  const completeQuiz = async () => {
    const finalScore = userAnswers.reduce((acc, ans, idx) => {
      return acc + (ans === quiz?.questions[idx]?.correct ? 1 : 0);
    }, 0);

    const timeTaken = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;
    
    const questionDetails: Record<string, any> = {};
    quiz?.questions.forEach((q, idx) => {
      questionDetails[idx] = {
        correct: userAnswers[idx] === q.correct,
        userAnswer: userAnswers[idx] || null
      };
    });

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
          total: quiz?.questions.length || 0,
          time_taken: timeTaken,
          question_details: questionDetails
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
    if (timeLeft > 15) return "text-[#34d399]";
    if (timeLeft > 5) return "text-[#fbbf24]";
    return "text-[#f87171]";
  };
  const timerSize = 48;
  const timerStroke = 4;
  const timerRadius = (timerSize - timerStroke) / 2;
  const timerCircumference = 2 * Math.PI * timerRadius;
  const timerOffset = timerCircumference - (timeLeft / TIMER_SECONDS) * timerCircumference;
  const getTimerStrokeColor = (): string => {
    if (timeLeft > 15) return "#34d399";
    if (timeLeft > 5) return "#fbbf24";
    return "#f87171";
  };

  if (phase === "loading") {
    return <main className="min-h-screen bg-transparent" />;
  }

  // --- Render Active Quiz Phase ---
  const renderActiveQuiz = () => {
    if (liveState && quiz) {
      return <LiveStudentView quiz={quiz} liveState={liveState} userAnswers={userAnswers} setUserAnswers={setUserAnswers} />;
    }

    if (phase === "enter_code") {
      return (
        <div className="flex h-full flex-col items-center justify-center">
          <motion.div
            className="edu-card flex flex-col items-center gap-6 text-center max-w-md w-full"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full glass-pill text-4xl shadow-lg border border-[var(--glass-border)]">
              🎮
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Join a Session
            </h2>
            <p className="text-[var(--text-secondary)]">
              Ask your teacher for the Game Pin to enter the quiz.
            </p>
            <form onSubmit={handlePinSubmit} className="w-full flex flex-col gap-4">
              <input
                type="text"
                placeholder="Game Pin"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className={`w-full rounded-xl bg-[rgba(255,255,255,0.08)] px-4 py-4 text-center text-2xl font-mono text-white placeholder-[var(--text-muted)] border outline-none transition-all ${pinError ? 'border-[var(--accent-red)] focus:border-[var(--accent-red)] focus:ring-1 focus:ring-[var(--accent-red)]' : 'border-[rgba(255,255,255,0.15)] focus:border-white focus:ring-1 focus:ring-white'}`}
                maxLength={6}
                required
              />
              {pinError && <p className="text-[#f87171] text-sm font-semibold">{pinError}</p>}
              <button
                type="submit"
                className="btn-primary w-full min-h-[52px]"
              >
                Enter
              </button>
            </form>
          </motion.div>
        </div>
      );
    }
    if (phase === "waiting") {
      return (
        <div className="flex h-full flex-col items-center justify-center">
          <motion.div
            className="edu-card flex flex-col items-center gap-6 text-center max-w-md w-full"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <motion.div 
              className="flex h-20 w-20 items-center justify-center rounded-full glass-pill text-[var(--text-muted)] text-4xl"
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
            >
              ⏳
            </motion.div>
            <h2 className="text-2xl font-bold text-white">
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
            className="edu-card flex flex-col items-center gap-6 text-center max-w-md w-full"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ borderTop: "4px solid rgba(248,113,113,0.8)" }}
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[rgba(239,68,68,0.15)] text-[#f87171] text-4xl border border-[rgba(248,113,113,0.5)]">
              ⛔
            </div>
            <h2 className="text-2xl font-bold text-white">
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
            <div className="edu-card flex flex-col items-center gap-6 text-center" style={{ backdropFilter: "blur(40px) saturate(200%)" }}>
              <div className="inline-flex glass-pill px-4 py-1.5 text-xs font-bold text-white mb-2 uppercase tracking-wider">
                {quiz.title}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Ready to start?
                </h2>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {quiz.questions.length} questions · {TIMER_SECONDS}s per
                  question
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-[rgba(251,191,36,0.1)] border border-[rgba(251,191,36,0.5)] px-4 py-3 text-sm text-[rgba(251,191,36,1)] w-full text-left">
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
                Start Quiz
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
              <h1 className="text-lg font-bold text-white truncate max-w-full sm:max-w-[70%]">
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
                    stroke="rgba(255,255,255,0.1)"
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
                  className="mb-4 flex items-center gap-2 rounded-lg border border-[rgba(248,113,113,0.5)] bg-[rgba(248,113,113,0.15)] px-4 py-3 text-sm font-medium text-[#f87171]"
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
                    ? "Finish Quiz"
                    : "Next Question"}
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
            <svg className="h-8 w-8 animate-spin text-white" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
            </svg>
          </div>
        ) : history.length === 0 ? (
          <div className="edu-card text-center py-12">
            <span className="text-4xl block mb-4">📭</span>
            <h3 className="text-lg font-medium text-white">No history yet</h3>
            <p className="text-[var(--text-secondary)] mt-2">Take your first quiz to see your results here.</p>
          </div>
        ) : (
          <div className="edu-card overflow-hidden !p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-[var(--text-secondary)]">
                <thead className="bg-[rgba(255,255,255,0.05)] border-b border-[rgba(255,255,255,0.1)] text-xs uppercase tracking-wider text-[var(--text-muted)]">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Quiz ID</th>
                    <th className="px-6 py-4 font-semibold text-center">Score</th>
                    <th className="px-6 py-4 font-semibold text-right">Date Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(255,255,255,0.08)]">
                  {history.map((r, i) => {
                    const pct = Math.round((r.score / r.total) * 100);
                    return (
                      <motion.tr 
                        key={i}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-medium text-white">Past Quiz</span>
                          <span className="block text-xs text-[var(--text-muted)] font-mono mt-1">{r.quiz_uuid.split('-')[0]}...</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 font-bold ${
                            pct >= 80 ? "bg-[rgba(52,211,153,0.15)] text-[#34d399]" :
                            pct >= 60 ? "bg-[rgba(251,191,36,0.15)] text-[#fbbf24]" :
                            "bg-[rgba(248,113,113,0.15)] text-[#f87171]"
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

  const renderLeaderboard = () => {
    return (
      <div className="flex flex-col gap-6 max-w-4xl mx-auto mt-4">
        <h2 className="text-xl font-bold text-white mb-2">Live Leaderboard</h2>
        
        {leaderboardLoading ? (
          <div className="flex items-center justify-center p-12">
            <svg className="h-8 w-8 animate-spin text-white" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
            </svg>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="edu-card text-center py-12">
            <span className="text-4xl block mb-4">🏆</span>
            <h3 className="text-lg font-medium text-white">No results yet</h3>
            <p className="text-[var(--text-secondary)] mt-2">Be the first to complete the quiz!</p>
          </div>
        ) : (
          <div className="edu-card overflow-hidden !p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-[var(--text-secondary)]">
                <thead className="bg-[rgba(255,255,255,0.05)] border-b border-[rgba(255,255,255,0.1)] text-xs uppercase tracking-wider text-[var(--text-muted)]">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-center">Rank</th>
                    <th className="px-6 py-4 font-semibold">Student</th>
                    <th className="px-6 py-4 font-semibold text-center">Score</th>
                    <th className="px-6 py-4 font-semibold text-right">Time Taken</th>
                    <th className="px-6 py-4 font-semibold text-center">Badges</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(255,255,255,0.08)]">
                  {leaderboard.map((r, i) => {
                    const pct = Math.round((r.score / r.total) * 100);
                    const badges = [];
                    if (pct === 100) badges.push({ icon: "🌟", label: "Perfect Score" });
                    if (i === 0) badges.push({ icon: "🥇", label: "1st Place" });
                    if (r.time_taken && r.time_taken < 15) badges.push({ icon: "⚡", label: "Speed Demon" });

                    return (
                      <motion.tr 
                        key={i}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`hover:bg-[rgba(255,255,255,0.05)] transition-colors ${r.student_name === studentName ? "bg-[rgba(255,255,255,0.1)] border-l-4 border-l-white" : ""}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-center font-bold text-white text-lg">
                          #{i + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`font-bold ${r.student_name === studentName ? "text-white" : "text-[var(--text-secondary)]"}`}>
                            {r.student_name} {r.student_name === studentName && "(You)"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 font-bold ${
                            pct >= 80 ? "bg-[rgba(52,211,153,0.15)] text-[#34d399]" :
                            pct >= 60 ? "bg-[rgba(251,191,36,0.15)] text-[#fbbf24]" :
                            "bg-[rgba(248,113,113,0.15)] text-[#f87171]"
                          }`}>
                            {r.score} / {r.total}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right font-mono">
                          {r.time_taken ? `${r.time_taken}s` : "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap flex items-center justify-center gap-1 text-xl">
                          {badges.map((b, idx) => (
                            <span key={idx} title={b.label} className="cursor-help drop-shadow-md">
                              {b.icon}
                            </span>
                          ))}
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
    <div className="flex h-screen bg-transparent overflow-hidden">
      {/* ── Sidebar ── */}
      <motion.div
        className="glass-sidebar w-64 flex-shrink-0 flex flex-col hidden md:flex z-50"
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className="p-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white uppercase">Nexus</h1>
              <p className="text-xs text-white/70 font-medium mt-1">Student Dashboard</p>
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
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "border border-[var(--glass-border-bright)] bg-[rgba(255,255,255,0.18)] text-white shadow-[0_2px_10px_rgba(0,0,0,0.1)]"
                    : "border border-transparent text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.08)] hover:text-white"
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[rgba(255,255,255,0.12)]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[#f87171] hover:bg-[rgba(248,113,113,0.1)] transition-colors"
          >
            <span className="text-lg">🚪</span>
            Log Out
          </button>
        </div>
      </motion.div>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Mobile Header */}
        <header className="md:hidden h-16 border-b border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.12)] backdrop-blur-[40px] flex items-center justify-between px-4 z-10 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎓</span>
            <h1 className="font-bold text-white tracking-tight">Student</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={handleLogout} className="text-xs text-[#f87171] font-semibold px-2">Logout</button>
          </div>
        </header>

        {/* Dynamic Welcome Animation */}
        <div className="absolute top-4 right-6 md:top-6 md:right-8 z-20 pointer-events-none hidden md:block">
          <motion.div
            initial={{ opacity: 0, scale: 1.1, x: "-40vw", y: "40vh" }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            transition={{ duration: 1.2, delay: 0.2, type: "spring", stiffness: 60 }}
            className="glass-pill px-4 py-2 shadow-lg flex items-center gap-2 border-[var(--glass-border)]"
          >
            <span className="text-lg">👋</span>
            <span className="text-sm font-semibold text-white">Hi, {studentName}</span>
          </motion.div>
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          {activeTab === "active" && renderActiveQuiz()}
          {activeTab === "leaderboard" && renderLeaderboard()}
          {activeTab === "history" && renderHistory()}
        </main>
      </div>

      {/* ── Mobile Bottom Tab Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex h-[64px] pb-[env(safe-area-inset-bottom)] border-t border-[rgba(255,255,255,0.12)] bg-[rgba(0,0,0,0.3)] backdrop-blur-[40px] md:hidden">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex flex-1 flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === tab.key
                ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                : "text-[var(--text-muted)] hover:text-white"
            }`}
          >
            <span className="text-xl leading-none">{tab.icon}</span>
            <span className="text-[0.65rem] font-semibold uppercase tracking-wide">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
