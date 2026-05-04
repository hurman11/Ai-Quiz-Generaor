"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import type { QuizQuestion } from "@/types/quiz";

interface ScoreCardProps {
  score: number;
  total: number;
  questions: QuizQuestion[];
  userAnswers: string[];
  studentName?: string;
  onBackHome: () => void;
}

function useCountUp(target: number, duration: number = 1500): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);

      if (current !== start) {
        start = current;
        setValue(current);
      }

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  }, [target, duration]);

  return value;
}

export default function ScoreCard({
  score,
  total,
  questions,
  userAnswers,
  studentName,
  onBackHome,
}: ScoreCardProps) {
  const percentage = total > 0 ? (score / total) * 100 : 0;
  const animatedScore = useCountUp(score, 1500);
  const submitted = useRef(false);

  // SVG circle math
  const size = 180;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  // Submit result to backend (once)
  useEffect(() => {
    if (submitted.current || !studentName) return;
    submitted.current = true;

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    fetch(`${API_URL}/submit-result`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_name: studentName,
        score,
        total,
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {
      /* silent failure */
    });
  }, [studentName, score, total]);

  // Performance message
  const getMessage = (): { text: string; emoji: string } => {
    if (percentage >= 90)
      return { text: "Outstanding! You're a star student!", emoji: "🌟" };
    if (percentage >= 70)
      return { text: "Great job! Keep it up!", emoji: "👏" };
    if (percentage >= 50)
      return {
        text: "Good effort! Review the answers and try again!",
        emoji: "📚",
      };
    return { text: "Don't give up! Practice makes perfect!", emoji: "💪" };
  };

  const message = getMessage();

  // Stroke color
  const getStrokeColor = (): string => {
    if (percentage >= 90) return "#16a34a";
    if (percentage >= 70) return "#2ed3ad";
    if (percentage >= 50) return "#d97706";
    return "#dc2626";
  };

  const getBadgeColor = (): string => {
    if (percentage >= 90) return "bg-accent-green/10 text-accent-green";
    if (percentage >= 70) return "bg-accent-teal/10 text-accent-teal";
    if (percentage >= 50) return "bg-accent-amber/10 text-accent-amber";
    return "bg-accent-red/10 text-accent-red";
  };

  return (
    <div className="edu-card">
      <div className="flex flex-col items-center gap-6">
        {/* ── Title ── */}
        <h2 className="font-heading text-xl font-bold text-text-primary">
          Quiz Results
        </h2>

        {/* ── SVG Ring ── */}
        <div className="relative flex items-center justify-center">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="-rotate-90"
          >
            {/* Background ring */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth={strokeWidth}
            />
            {/* Progress ring */}
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={getStrokeColor()}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          </svg>
          {/* Score overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-heading text-3xl font-bold text-text-primary">
              {animatedScore}
              <span className="text-lg text-text-secondary"> / {total}</span>
            </span>
            <span className="text-sm text-text-secondary">
              {Math.round(percentage)}%
            </span>
          </div>
        </div>

        {/* ── Message ── */}
        <motion.div
          className={`rounded-full px-6 py-2 text-sm font-semibold ${getBadgeColor()}`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1, duration: 0.4 }}
        >
          {message.emoji} {message.text}
        </motion.div>

        {/* ── Answer Review ── */}
        <div className="w-full">
          <h3 className="mb-3 text-sm font-semibold text-text-secondary">
            Answer Review
          </h3>
          <div className="max-h-60 overflow-y-auto">
            <div className="flex flex-col gap-2">
              {questions.map((q, idx) => {
                const isCorrect = userAnswers[idx] === q.correct;
                return (
                  <div
                    key={q.id}
                    className={`flex items-start gap-3 rounded-lg border-l-3 py-2 pl-3 ${
                      isCorrect
                        ? "border-accent-green/40 bg-accent-green/5"
                        : "border-accent-red/40 bg-accent-red/5"
                    }`}
                  >
                    <span
                      className={`mt-0.5 text-sm font-bold ${
                        isCorrect ? "text-accent-green" : "text-accent-red"
                      }`}
                    >
                      {isCorrect ? "✓" : "✗"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary/80 line-clamp-2">
                        {q.question}
                      </p>
                      {!isCorrect && (
                        <p className="mt-1 text-xs text-accent-green/80">
                          Correct: {q.correct} —{" "}
                          {q.options[q.correct as keyof typeof q.options]}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Action Button ── */}
        <button
          id="back-home-btn"
          type="button"
          onClick={onBackHome}
          className="btn-primary w-full py-3"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
