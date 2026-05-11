"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function TeacherLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Signing in...");
  const [isTimeout, setIsTimeout] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");
    setIsTimeout(false);
    setStatusMessage("Signing in...");

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      if (elapsed >= 20) setStatusMessage("This is taking longer than usual...");
      else if (elapsed >= 9) setStatusMessage("Almost there, please wait...");
      else if (elapsed >= 4) setStatusMessage("Connecting to server...");
    }, 1000);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      setIsTimeout(true);
    }, 30000);

    try {
      // Even if login is local, we "ping" the backend to wake up the HF space 
      // so the dashboard doesn't hang immediately after redirect.
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      await fetch(`${API_URL}/active-quiz`, { signal: controller.signal }).catch(() => {});

      clearInterval(interval);
      clearTimeout(timeoutId);

      if (password === "admin123") {
        localStorage.setItem("teacher_auth", "true");
        router.push("/teacher/dashboard");
      } else {
        setError("Invalid PIN. Please try again.");
        setLoading(false);
      }
    } catch (err: any) {
      clearInterval(interval);
      clearTimeout(timeoutId);
      if (err.name === 'AbortError' || isTimeout) {
        setError("Connection timed out. The server might be starting up.");
        setIsTimeout(true);
      } else {
        setError("An error occurred. Please check your connection.");
      }
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4 bg-transparent">
      <motion.div
        className="w-full max-w-md p-8 edu-card relative overflow-hidden"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{
          boxShadow: "inset 0 0 60px rgba(255,255,255,0.05), var(--glass-shadow-heavy)"
        }}
      >
        {/* Home Button */}
        <button 
          onClick={() => router.push("/")}
          className="absolute top-4 left-4 text-[var(--text-secondary)] hover:text-white flex items-center gap-1 text-sm transition-colors z-10 font-medium px-2 py-1 rounded"
        >
          <span>←</span> Home
        </button>

        <div className="flex flex-col gap-6 mt-8">
          <div className="text-center">
            <div className="inline-flex glass-pill px-4 py-1.5 text-xs font-bold text-white mb-6 uppercase tracking-wider">
              Teacher Access
            </div>
            <h1 className="text-2xl font-bold text-white">
              Teacher Portal
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Enter your PIN to access the dashboard.
            </p>
          </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter Access PIN"
              className="edu-input text-center text-lg tracking-widest"
              required
              disabled={loading}
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex flex-col gap-3"
            >
              <p className="error-banner text-center py-2 px-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </p>
              {(isTimeout || error.includes("error")) && (
                <button
                  type="button"
                  onClick={handleLogin}
                  className="text-[var(--accent-cyan)] text-xs font-bold uppercase tracking-widest hover:underline"
                >
                  🔄 Click here to retry
                </button>
              )}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-2 min-h-[52px] flex items-center justify-center gap-3 disabled:opacity-70"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="animate-pulse">{statusMessage}</span>
              </>
            ) : (
              "Authenticate"
            )}
          </button>
        </form>
        </div>
      </motion.div>
    </main>
  );
}

