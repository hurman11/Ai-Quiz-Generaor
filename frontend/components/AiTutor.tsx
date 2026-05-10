"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { QuizQuestion } from "@/types/quiz";

interface AiTutorProps {
  questions: QuizQuestion[];
  userAnswers: string[];
}

export default function AiTutor({ questions, userAnswers }: AiTutorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [error, setError] = useState("");

  const wrongQuestions = questions
    .map((q, idx) => ({ ...q, user_answer: userAnswers[idx] }))
    .filter((q) => q.user_answer !== q.correct);

  if (wrongQuestions.length === 0) return null;

  const handleExplain = async () => {
    if (explanation) {
      setIsOpen(true);
      return;
    }

    setIsOpen(true);
    setLoading(true);
    setError("");

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API_URL}/ai-tutor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wrong_questions: wrongQuestions.map((q) => ({
            question: q.question,
            options: q.options,
            correct: q.correct,
            user_answer: q.user_answer,
          })),
        }),
      });

      if (!res.ok) throw new Error("Failed to get explanation");

      const data = await res.json();
      setExplanation(data.explanation);
    } catch (err: any) {
      setError("Could not reach AI Tutor. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full mt-4">
      <button
        onClick={handleExplain}
        className="w-full py-4 rounded-2xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3"
        style={{
          background: "linear-gradient(135deg, rgba(167,139,250,0.25), rgba(34,211,238,0.25))",
          border: "1px solid rgba(167,139,250,0.4)",
          color: "white",
          boxShadow: "0 0 20px rgba(167,139,250,0.15)",
        }}
      >
        <span className="text-2xl">🤖</span>
        {explanation ? "Show AI Tutor Explanation" : `Explain My ${wrongQuestions.length} Mistake${wrongQuestions.length > 1 ? "s" : ""}`}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden"
          >
            <div
              className="mt-4 rounded-2xl p-6 border"
              style={{
                background: "rgba(167,139,250,0.08)",
                borderColor: "rgba(167,139,250,0.25)",
                backdropFilter: "blur(20px)",
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                    style={{ background: "rgba(167,139,250,0.2)", border: "1px solid rgba(167,139,250,0.4)" }}
                  >
                    🤖
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-sm">AI Tutor</h3>
                    <p className="text-xs" style={{ color: "rgba(167,139,250,0.8)" }}>
                      Powered by Llama 3
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/40 hover:text-white/80 transition-colors text-xl"
                >
                  ✕
                </button>
              </div>

              {/* Content */}
              {loading && (
                <div className="flex flex-col items-center py-8 gap-4">
                  <div className="flex gap-2">
                    <span className="w-3 h-3 bg-[var(--accent-purple)] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-3 h-3 bg-[var(--accent-cyan)] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-3 h-3 bg-[var(--accent-purple)] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">AI Tutor is analyzing your answers...</p>
                </div>
              )}

              {error && (
                <div className="error-banner text-center">{error}</div>
              )}

              {explanation && !loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar"
                >
                  <div
                    className="text-sm leading-relaxed whitespace-pre-wrap"
                    style={{ color: "rgba(255,255,255,0.85)" }}
                  >
                    {explanation}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
