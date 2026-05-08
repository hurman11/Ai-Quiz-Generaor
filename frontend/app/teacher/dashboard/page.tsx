"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import QuizForm from "@/components/QuizForm";
import type { Quiz } from "@/types/quiz";
import * as XLSX from "xlsx";

interface StudentResult {
  student_name: string;
  score: number;
  total: number;
  timestamp: string;
  time_taken?: number;
  question_details?: Record<string, { correct: boolean; userAnswer: string | null }>;
}

interface ResultsResponse {
  results: StudentResult[];
  registered_count: number;
}

type TabKey = "generate" | "active" | "results";

const tabs: { key: TabKey; label: string; icon: string }[] = [
  { key: "generate", label: "Generate Quiz", icon: "✨" },
  { key: "active", label: "Active", icon: "📋" },
  { key: "results", label: "Results", icon: "📊" },
];

export default function TeacherDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("generate");
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [registeredCount, setRegisteredCount] = useState<number>(0);
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
        const data: ResultsResponse = await res.json();
        setResults(data.results || []);
        setRegisteredCount(data.registered_count || 0);
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

  const handleClearQuiz = async () => {
    localStorage.removeItem("active_quiz");
    setActiveQuiz(null);
    setResults([]);
    setRegisteredCount(0);
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    try {
      await fetch(`${API_URL}/active-quiz`, { method: "DELETE" });
    } catch {
      // ignore
    }
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

  const completionRate =
    registeredCount > 0
      ? ((results.length / registeredCount) * 100).toFixed(0)
      : "0";


  const exportToExcel = async () => {
    if (results.length === 0) return;

    const exportData = results.map((r, idx) => {
      const pct = ((r.score / r.total) * 100).toFixed(1);
      return {
        "#": idx + 1,
        "Student Name": r.student_name,
        "Score": r.score,
        "Total": r.total,
        "Percentage (%)": Number(pct),
        "Status": "Completed",
        "Submitted At": new Date(r.timestamp).toLocaleString(),
      };
    });

    const summaryData = [
      { "#": "", "Student Name": "Total Students:", "Score": results.length, "Total": "", "Percentage (%)": "", "Status": "", "Submitted At": "" },
      { "#": "", "Student Name": "Average Score:", "Score": "", "Total": "", "Percentage (%)": Number(averageScore), "Status": "", "Submitted At": "" },
    ];

    const worksheet = XLSX.utils.json_to_sheet([...exportData, {}, ...summaryData]);
    
    // Auto-size columns
    const colWidths = [
      { wch: 5 },  // #
      { wch: 25 }, // Name
      { wch: 10 }, // Score
      { wch: 10 }, // Total
      { wch: 15 }, // %
      { wch: 15 }, // Status
      { wch: 25 }, // Time
    ];
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Results");

    const dateStr = new Date().toISOString().split("T")[0];
    XLSX.writeFile(workbook, `QuizResults_${dateStr}.xlsx`);

    // Auto-clear results and registered students after downloading
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      await fetch(`${API_URL}/results`, { method: "DELETE" });
      setResults([]);
      setRegisteredCount(0);
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex min-h-screen flex-col pb-[64px] md:pb-0 bg-transparent">
      {/* ── Top Navbar ── */}
      <header className="glass-nav sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="text-xl">⚡</span>
          <span className="font-bold text-white text-lg tracking-wider uppercase">
            Nexus
          </span>
          <span className="hidden sm:inline-block rounded-full bg-[rgba(255,255,255,0.15)] px-3 py-0.5 text-xs font-semibold text-white border border-[var(--glass-border)]">
            Teacher Dashboard
          </span>
        </div>
        <button
          id="logout-btn"
          onClick={handleLogout}
          className="btn-outline px-4 py-2 text-sm min-h-[40px] hover:text-[#f87171] hover:border-[#f87171]"
        >
          Logout
        </button>
      </header>

      <div className="flex flex-1 relative">
        {/* ── Desktop Sidebar ── */}
        <aside className="glass-sidebar hidden w-64 flex-shrink-0 p-4 md:block sticky top-[65px] h-[calc(100vh-65px)] overflow-y-auto">
          <nav className="flex flex-col gap-2 mt-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-all duration-200 ${
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
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 w-full overflow-y-auto page-container bg-transparent">
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
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-[rgba(255,255,255,0.1)]">
                  <h2 className="text-2xl font-bold text-white">Generate a New Quiz</h2>
                </div>
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
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-[rgba(255,255,255,0.1)]">
                  <h2 className="text-2xl font-bold text-white">Active Quiz</h2>
                </div>

                {activeQuiz ? (
                  <div className="edu-card flex flex-col gap-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-bold text-white">
                          {activeQuiz.title}
                        </h3>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          {activeQuiz.questions.length} questions
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-green)] opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--accent-green)] shadow-[0_0_8px_var(--accent-green)]"></span>
                        </span>
                        <span className="text-xs font-semibold text-[var(--accent-green)]">LIVE</span>
                      </div>
                    </div>

                    {/* Shareable Link */}
                    <div className="rounded-lg border border-[var(--glass-border)] bg-[rgba(255,255,255,0.05)] p-4">
                      <p className="mb-2 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                        Student Link
                      </p>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <code className="flex-1 rounded-md bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.1)] px-3 py-2 text-sm text-[var(--text-body)] break-all text-white font-mono">
                          {studentLink}
                        </code>
                        <button
                          onClick={handleCopyLink}
                          className="btn-outline px-4 py-2 text-sm sm:w-auto"
                        >
                          {copied ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleClearQuiz}
                      className="btn-danger w-full sm:w-auto self-start mt-2"
                    >
                      Clear Active Quiz
                    </button>
                  </div>
                ) : (
                  <div className="edu-card flex flex-col items-center gap-4 py-12 text-center" style={{ borderStyle: 'dashed' }}>
                    <span className="text-5xl opacity-80">📭</span>
                    <p className="text-[var(--text-secondary)]">
                      No quiz is currently active
                    </p>
                    <button
                      onClick={() => setActiveTab("generate")}
                      className="btn-primary mt-2"
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
                className="mx-auto max-w-4xl"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4 border-b border-[rgba(255,255,255,0.1)] gap-4">
                  <h2 className="text-2xl font-bold text-white">
                    Student Results
                  </h2>
                  <button
                    onClick={exportToExcel}
                    disabled={results.length === 0}
                    className="btn-success disabled:opacity-50 disabled:bg-[rgba(255,255,255,0.05)] disabled:border-[var(--glass-border)] disabled:text-[var(--text-secondary)] w-full sm:w-auto text-sm"
                  >
                    ⬇ Export to Excel
                  </button>
                </div>

                {/* Summary Bar */}
                <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="edu-card p-4 flex flex-col items-center justify-center text-center">
                    <span className="text-3xl font-bold text-white">{registeredCount}</span>
                    <span className="text-xs text-[var(--text-secondary)] mt-1 uppercase tracking-wider font-semibold">Registered</span>
                  </div>
                  <div className="edu-card p-4 flex flex-col items-center justify-center text-center">
                    <span className="text-3xl font-bold text-white">{results.length}</span>
                    <span className="text-xs text-[var(--text-secondary)] mt-1 uppercase tracking-wider font-semibold">Attempts</span>
                  </div>
                  <div className="edu-card p-4 flex flex-col items-center justify-center text-center">
                    <span className="text-3xl font-bold text-white">{averageScore}%</span>
                    <span className="text-xs text-[var(--text-secondary)] mt-1 uppercase tracking-wider font-semibold">Avg Score</span>
                  </div>
                  <div className="edu-card p-4 flex flex-col items-center justify-center text-center">
                    <span className="text-3xl font-bold text-white">{completionRate}%</span>
                    <span className="text-xs text-[var(--text-secondary)] mt-1 uppercase tracking-wider font-semibold">Completion</span>
                  </div>
                </div>

                {results.length > 0 ? (
                  <div className="edu-card overflow-hidden p-0 bg-[rgba(255,255,255,0.05)] border-[var(--glass-border)]">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead>
                          <tr className="border-b border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.08)] text-[var(--text-secondary)] uppercase text-xs tracking-wider">
                            <th className="px-5 py-4 font-semibold">Student</th>
                            <th className="px-5 py-4 font-semibold text-center sm:text-left">Score</th>
                            <th className="px-5 py-4 font-semibold text-center sm:text-left">Percentage</th>
                            <th className="hidden sm:table-cell px-5 py-4 font-semibold">Submitted</th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.map((r, idx) => {
                            const pct = ((r.score / r.total) * 100).toFixed(0);
                            return (
                              <tr
                                key={idx}
                                className="border-b border-[rgba(255,255,255,0.06)] last:border-0 hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                              >
                                <td className="px-5 py-4 font-medium text-white">
                                  {r.student_name}
                                </td>
                                <td className="px-5 py-4 text-[var(--text-secondary)] text-center sm:text-left">
                                  {r.score}/{r.total}
                                </td>
                                <td className="px-5 py-4 text-center sm:text-left">
                                  <span
                                    className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                                      Number(pct) >= 70
                                        ? "bg-[var(--glass-green)] text-white border-[var(--border-green)]"
                                        : Number(pct) >= 50
                                        ? "bg-[var(--glass-amber)] text-white border-[var(--border-amber)]"
                                        : "bg-[var(--glass-red)] text-white border-[var(--border-red)]"
                                    }`}
                                  >
                                    {pct}%
                                  </span>
                                </td>
                                <td className="hidden sm:table-cell px-5 py-4 text-[var(--text-muted)] text-xs">
                                  {new Date(r.timestamp).toLocaleString()}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="edu-card flex flex-col items-center gap-4 py-12 text-center" style={{ borderStyle: 'dashed' }}>
                    <span className="text-5xl opacity-80">⏳</span>
                    <p className="text-[var(--text-secondary)]">
                      Waiting for students to complete the quiz...
                    </p>
                  </div>
                )}
              </motion.div>
            )}


          </AnimatePresence>
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
