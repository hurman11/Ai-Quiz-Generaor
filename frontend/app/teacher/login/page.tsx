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
    <main className="flex min-h-screen items-center justify-center p-4">
      <motion.div
        className="w-full max-w-md p-8 edu-card-solid relative overflow-hidden"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{
          boxShadow: "0 0 40px rgba(99, 102, 241, 0.1)"
        }}
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-[var(--gradient-brand)] animate-pulseGlow"></div>
        
        {/* Home Button */}
        <button 
          onClick={() => router.push("/")}
          className="absolute top-4 left-4 text-[var(--text-secondary)] hover:text-white flex items-center gap-1 text-sm transition-colors z-10 font-medium bg-black/20 px-2 py-1 rounded hover:bg-black/40"
        >
          <span>←</span> Home
        </button>

        <div className="flex flex-col gap-6 mt-4">
          <div className="text-center">
            <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-[rgba(59,130,246,0.15)] text-[var(--accent-blue)] text-3xl mb-4 border border-[var(--accent-blue)] shadow-[0_0_15px_rgba(59,130,246,0.2)]">
              👨‍🏫
            </div>
            <h1 className="font-heading text-2xl font-bold text-white">
              Teacher Portal
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Enter your PIN to access the dashboard.
            </p>
          </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-text-secondary">
              Access Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="edu-input w-full"
              style={{ minHeight: "48px" }}
              required
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="error-banner text-center"
            >
              Invalid password. Try "admin123".
            </motion.p>
          )}

          <button
            type="submit"
            className="btn-primary w-full mt-2"
            style={{ minHeight: "48px" }}
          >
            Authenticate
          </button>
        </form>
        
        <button
          type="button"
          onClick={() => router.push("/")}
          className="text-xs text-[var(--text-muted)] hover:text-white transition-colors mt-2 text-center w-full"
        >
          ← Return to Home
        </button>
        </div>
      </motion.div>
    </main>
  );
}
