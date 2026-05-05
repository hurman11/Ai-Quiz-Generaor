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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="edu-card-solid flex flex-col gap-6"
        style={{ width: "calc(100% - 32px)", maxWidth: "420px", margin: "0 auto", padding: "clamp(24px, 5vw, 36px)" }}
      >
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold tracking-widest mb-6" style={{ background: "rgba(0,212,255,0.15)", color: "var(--accent-cyan)", borderColor: "var(--border-glow)" }}>
            <span className="h-2 w-2 rounded-full bg-accent-cyan shadow-[0_0_8px_var(--accent-cyan)]"></span>
            TEACHER ACCESS
          </div>
          <h1 className="font-heading text-2xl font-bold text-white">
            Authentication Required
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Please enter your admin credentials to access the dashboard.
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
          className="text-xs text-text-muted hover:text-white transition-colors mt-2 text-center"
        >
          ← Return to Home
        </button>
      </motion.div>
    </main>
  );
}
