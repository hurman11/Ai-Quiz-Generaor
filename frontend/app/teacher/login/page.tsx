"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function TeacherLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === "teacher" && password === "admin123") {
      localStorage.setItem("teacher_auth", "true");
      router.push("/teacher/dashboard");
    } else {
      setError("Incorrect credentials");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="edu-card">
          {/* Header */}
          <div className="mb-6 flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-purple/10 text-2xl">
              🔒
            </div>
            <h1 className="font-heading text-2xl font-bold text-text-primary">
              Teacher Login
            </h1>
            <p className="text-sm text-text-secondary">
              Sign in to manage your quizzes
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                Username
              </label>
              <input
                id="teacher-username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError("");
                }}
                placeholder="Enter your username"
                className="edu-input"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">
                Password
              </label>
              <input
                id="teacher-password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                placeholder="Enter your password"
                className="edu-input"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <motion.div
                className="error-banner"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {error}
              </motion.div>
            )}

            <button
              id="teacher-login-btn"
              type="submit"
              className="btn-primary mt-2 w-full py-3"
            >
              Sign In
            </button>
          </form>

          {/* Back Link */}
          <div className="mt-6 text-center">
            <button
              onClick={() => router.push("/")}
              className="text-sm text-text-secondary hover:text-accent-teal transition-colors"
            >
              ← Back to role selection
            </button>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
