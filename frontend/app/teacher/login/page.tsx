"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function TeacherLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "admin123") {
      localStorage.setItem("teacher_auth", "true");
      router.push("/teacher/dashboard");
    } else {
      setError(true);
      setTimeout(() => setError(false), 3000);
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
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="error-banner text-center"
            >
              Invalid PIN. Try "admin123".
            </motion.p>
          )}

          <button
            type="submit"
            className="btn-primary w-full mt-2"
          >
            Authenticate
          </button>
        </form>
        </div>
      </motion.div>
    </main>
  );
}
