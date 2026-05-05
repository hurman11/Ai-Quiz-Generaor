"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

export default function StudentRegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        setError(data.detail || "Registration failed. Email might already be in use.");
        setLoading(false);
        return;
      }

      // Store JWT token
      localStorage.setItem("student_token", data.token);
      localStorage.setItem("student_name", data.user.name);
      
      router.push("/student");
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center page-container relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md mx-auto"
      >
        <div className="edu-card-solid flex flex-col gap-6">
          <div className="text-center">
            <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-[rgba(0,212,255,0.15)] text-[var(--accent-cyan)] text-3xl mb-4 border border-[var(--accent-cyan)]">
              🎓
            </div>
            <h1 className="font-heading text-2xl font-bold text-white">
              Create Account
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Join the platform to take quizzes and track your progress.
            </p>
          </div>

          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-[var(--text-secondary)]">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="edu-input w-full"
                required
              />
            </div>

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
                minLength={6}
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
              {loading ? "Creating Account..." : "Sign Up →"}
            </button>
            
            <p className="text-center text-sm text-[var(--text-secondary)] mt-2">
              Already have an account?{" "}
              <Link href="/student/login" className="text-[var(--accent-cyan)] font-semibold hover:underline">
                Sign in here
              </Link>
            </p>
          </form>
        </div>
      </motion.div>
    </main>
  );
}
