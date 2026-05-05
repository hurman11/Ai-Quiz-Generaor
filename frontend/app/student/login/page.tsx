"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

export default function StudentLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      let data;
      try {
        data = await res.json();
      } catch (e) {
        setError("Backend server is starting up or unreachable. Please wait a minute and try again.");
        setLoading(false);
        return;
      }
      
      if (!res.ok) {
        setError(data.detail || "Invalid login credentials.");
        setLoading(false);
        return;
      }

      // Store JWT token
      localStorage.setItem("student_token", data.token);
      localStorage.setItem("student_name", data.user.name);
      
      router.push("/student");
    } catch {
      setError("Network error. The server might be sleeping or unreachable.");
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center page-container relative z-10">
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
            <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-[rgba(124,58,237,0.15)] text-[var(--accent-purple)] text-3xl mb-4 border border-[var(--accent-purple)] shadow-[0_0_15px_rgba(124,58,237,0.2)]">
              🔐
            </div>
            <h1 className="font-heading text-2xl font-bold text-white">
              Student Login
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Welcome back! Please sign in to your dashboard.
            </p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-[var(--text-secondary)]">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                className="edu-input w-full"
                required
              />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-[var(--text-secondary)]">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="edu-input w-full font-mono text-lg tracking-widest"
                required
              />
            </div>

            {error && (
              <p className="error-banner text-center">{error}</p>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary w-full mt-2 min-h-[52px] disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In →"}
            </button>
            
            <p className="text-center text-sm text-[var(--text-secondary)] mt-2">
              Don't have an account?{" "}
              <Link href="/student/register" className="text-[var(--accent-cyan)] font-semibold hover:underline">
                Create one here
              </Link>
            </p>
          </form>
        </div>
      </motion.div>
    </main>
  );
}
