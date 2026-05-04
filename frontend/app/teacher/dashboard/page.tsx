"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import QuizForm from "@/components/QuizForm";
import type { Quiz } from "@/types/quiz";

interface StudentResult {
  student_name: string;
  score: number;
  total: number;
  timestamp: string;
}

type TabKey = "generate" | "active" | "results";

const tabs: { key: TabKey; label: string; icon: string }[] = [
  { key: "generate", label: "Generate Quiz", icon: "✨" },
  { key: "active", label: "Active Quiz", icon: "📋" },
  { key: "results", label: "Student Results", icon: "📊" },
];

export default function TeacherDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("generate");
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [copied, setCopied] = useState(false);

  // Auth guard
  useEffect(() => {
    if (localStorage.getItem("teacher_auth") !== "true") {
      router.push("/teacher/login");
    }
  }, [router]);

  // Load active quiz from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("active_quiz");
    if (stored) {
      try {
        setActiveQuiz(JSON.parse(stored));
      } catch {
        /* ignore */
      }
    }
  }, [activeTab]);

  // Poll results every 5 seconds
  const fetchResults = useCallback(async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API_URL}/results`);
      if (res.ok) {
        const data: StudentResult[] = await res.json();
        setResults(data);
      }
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    if (activeTab === "results") {
      fetchResults();
      const interval = setInterval(fetchResults, 5000);
      return () => clearInterval(interval);
    }
  }, [activeTab, fetchResults]);

  const handleLogout = () => {
    localStorage.removeItem("teacher_auth");
    router.push("/");
  };

  const handleClearQuiz = () => {
    localStorage.removeItem("active_quiz");
    setActiveQuiz(null);
  };

  const handleCopyLink = () => {
    const link = typeof window !== "undefined" ? `${window.location.origin}/student` : "http://localhost:3000/student";
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const studentLink = typeof window !== "undefined" ? `${window.location.origin}/student` : "http://localhost:3000/student";

  const averageScore =
    results.length > 0
      ? (
          results.reduce((sum, r) => sum + (r.score / r.total) * 100, 0) /
          results.length
        ).toFixed(1)
      : "0";

  return (
    <div className="flex min-h-screen flex-col">
      {/* ── Top Navbar ── */}
      <header className="glass-nav sticky top-0 z-50 flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="text-xl">📝</span>
          <span className="font-heading text-lg font-bold text-text-primary">
            QuizGen
          </span>
          <span className="hidden sm:inline-block rounded-full bg-accent-purple/10 px-3 py-0.5 text-xs font-semibold text-accent-purple">
            Teacher Dashboard
          </span>
        </div>
        <button
          id="logout-btn"
          onClick={handleLogout}
          className="btn-outline px-4 py-2 text-sm"
        >
          Logout
        </button>
      </header>

      <div className="flex flex-1">
        {/* ── Sidebar ── */}
        <aside className="glass-sidebar hidden w-64 flex-shrink-0 p-4 md:block">
          <nav className="flex flex-col gap-1 mt-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.key
                    ? "bg-white/15 text-white"
                    : "text-white/60 hover:bg-white/10 hover:text-white/90"
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Mobile Tab Bar ── */}
        <div className="flex w-full border-b border-border bg-white/50 backdrop-blur-lg md:hidden">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-3 text-center text-xs font-semibold transition-colors ${
                activeTab === tab.key
                  ? "border-b-2 border-accent-teal text-accent-teal"
                  : "text-text-secondary"
              }`}
            >
              <span className="block text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Main Content ── */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <AnimatePresence mode="wait">
            {/* ─── Generate Quiz Tab ─── */}
            {activeTab === "generate" && (
              <motion.div
                key="generate"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="mx-auto max-w-2xl"
              >
                <h2 className="mb-6 font-heading text-2xl font-bold text-text-primary">
                  Generate a New Quiz
                </h2>
                <div className="edu-card">
                  <QuizForm />
                </div>
              </motion.div>
            )}

            {/* ─── Active Quiz Tab ─── */}
            {activeTab === "active" && (
              <motion.div
                key="active"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="mx-auto max-w-2xl"
              >
                <h2 className="mb-6 font-heading text-2xl font-bold text-text-primary">
                  Active Quiz
                </h2>

                {activeQuiz ? (
                  <div className="edu-card flex flex-col gap-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-heading text-lg font-bold text-text-primary">
                          {activeQuiz.title}
                        </h3>
                        <p className="mt-1 text-sm text-text-secondary">
                          {activeQuiz.questions.length} questions
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent-green/10 px-3 py-1 text-xs font-semibold text-accent-green">
                        ● Live
                      </span>
                    </div>

                    {/* Shareable Link */}
                    <div className="rounded-lg border border-border bg-bg-base p-4">
                      <p className="mb-2 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        Student Link
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 rounded-md bg-bg-card border border-border px-3 py-2 text-sm text-text-primary">
                          {studentLink}
                        </code>
                        <button
                          onClick={handleCopyLink}
                          className="btn-primary px-4 py-2 text-sm"
                        >
                          {copied ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleClearQuiz}
                      className="btn-danger self-start"
                    >
                      Clear Active Quiz
                    </button>
                  </div>
                ) : (
                  <div className="edu-card flex flex-col items-center gap-4 py-12 text-center">
                    <span className="text-5xl">📭</span>
                    <p className="text-text-secondary">
                      No quiz is currently active
                    </p>
                    <button
                      onClick={() => setActiveTab("generate")}
                      className="btn-primary"
                    >
                      Generate a Quiz
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* ─── Student Results Tab ─── */}
            {activeTab === "results" && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="mx-auto max-w-3xl"
              >
                <h2 className="mb-6 font-heading text-2xl font-bold text-text-primary">
                  Student Results
                </h2>

                {/* Summary Bar */}
                {results.length > 0 && (
                  <div className="mb-6 grid grid-cols-2 gap-4">
                    <div className="edu-card flex flex-col items-center p-4">
                      <span className="text-3xl font-bold text-accent-teal">
                        {results.length}
                      </span>
                      <span className="text-xs text-text-secondary">
                        Total Attempts
                      </span>
                    </div>
                    <div className="edu-card flex flex-col items-center p-4">
                      <span className="text-3xl font-bold text-accent-green">
                        {averageScore}%
                      </span>
                      <span className="text-xs text-text-secondary">
                        Average Score
                      </span>
                    </div>
                  </div>
                )}

                {results.length > 0 ? (
                  <div className="edu-card overflow-hidden p-0">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-border/50 bg-white/30">
                          <th className="px-5 py-3 font-semibold text-text-secondary">
                            Student
                          </th>
                          <th className="px-5 py-3 font-semibold text-text-secondary">
                            Score
                          </th>
                          <th className="px-5 py-3 font-semibold text-text-secondary">
                            Percentage
                          </th>
                          <th className="hidden px-5 py-3 font-semibold text-text-secondary sm:table-cell">
                            Submitted
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((r, idx) => {
                          const pct = ((r.score / r.total) * 100).toFixed(0);
                          return (
                            <tr
                              key={idx}
                              className="border-b border-border last:border-0 hover:bg-bg-base/60 transition-colors"
                            >
                              <td className="px-5 py-3 font-medium text-text-primary">
                                {r.student_name}
                              </td>
                              <td className="px-5 py-3 text-text-secondary">
                                {r.score}/{r.total}
                              </td>
                              <td className="px-5 py-3">
                                <span
                                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                    Number(pct) >= 70
                                      ? "bg-accent-green/10 text-accent-green"
                                      : Number(pct) >= 50
                                      ? "bg-accent-amber/10 text-accent-amber"
                                      : "bg-accent-red/10 text-accent-red"
                                  }`}
                                >
                                  {pct}%
                                </span>
                              </td>
                              <td className="hidden px-5 py-3 text-text-secondary sm:table-cell">
                                {new Date(r.timestamp).toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="edu-card flex flex-col items-center gap-4 py-12 text-center">
                    <span className="text-5xl">⏳</span>
                    <p className="text-text-secondary">
                      Waiting for students to complete the quiz...
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
