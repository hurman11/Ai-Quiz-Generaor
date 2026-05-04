"use client";

import { motion } from "framer-motion";
import type { QuizQuestion as QuizQuestionType } from "@/types/quiz";

interface QuizQuestionProps {
  question: QuizQuestionType;
  onAnswer: (answer: string) => void;
  answered: boolean;
  selectedAnswer: string | null;
}

const optionKeys = ["A", "B", "C", "D"] as const;

export default function QuizQuestion({
  question,
  onAnswer,
  answered,
  selectedAnswer,
}: QuizQuestionProps) {
  const getOptionStyle = (key: string): string => {
    if (!answered) {
      return "border-white/40 bg-white/30 backdrop-blur-sm hover:border-accent-blue/50 hover:bg-white/50";
    }

    const isCorrect = key === question.correct;
    const isSelected = key === selectedAnswer;

    if (isCorrect) {
      return "border-accent-green/50 bg-accent-green/15 backdrop-blur-sm";
    }
    if (isSelected && !isCorrect) {
      return "border-accent-red/50 bg-accent-red/15 backdrop-blur-sm animate-shake";
    }
    return "border-white/20 bg-white/10 opacity-50";
  };

  const getLetterStyle = (key: string): string => {
    if (!answered) return "border-white/30 bg-white/40 text-text-secondary";

    const isCorrect = key === question.correct;
    const isSelected = key === selectedAnswer;

    if (isCorrect) return "border-accent-green/40 bg-accent-green/20 text-accent-green";
    if (isSelected && !isCorrect) return "border-accent-red/40 bg-accent-red/20 text-accent-red";
    return "border-white/20 bg-white/20 text-text-secondary/40";
  };

  return (
    <div className="edu-card">
      {/* ── Question Badge ── */}
      <span className="mb-4 inline-block rounded-full bg-accent-teal/10 px-3 py-1 text-xs font-semibold text-accent-teal">
        Question {question.id}
      </span>

      {/* ── Question Text ── */}
      <p className="mb-6 text-base font-medium leading-relaxed text-text-primary sm:text-lg">
        {question.question}
      </p>

      {/* ── Options ── */}
      <div className="flex flex-col gap-3">
        {optionKeys.map((key, index) => (
          <motion.button
            key={key}
            type="button"
            onClick={() => !answered && onAnswer(key)}
            disabled={answered}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05, duration: 0.25 }}
            className={`flex min-h-[48px] items-center gap-3 rounded-btn border px-4 py-3 text-left transition-all duration-200 ${getOptionStyle(key)} ${
              answered ? "cursor-default" : "cursor-pointer"
            }`}
          >
            <span
              className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border text-sm font-semibold ${getLetterStyle(key)}`}
            >
              {key}
            </span>
            <span className="text-sm text-text-primary">
              {question.options[key as keyof typeof question.options]}
            </span>

            {/* ── Correct/Wrong Labels ── */}
            {answered && key === question.correct && (
              <span className="ml-auto text-xs font-semibold text-accent-green">
                ✓ Correct
              </span>
            )}
            {answered &&
              key === selectedAnswer &&
              key !== question.correct && (
                <span className="ml-auto text-xs font-semibold text-accent-red">
                  ✗ Wrong
                </span>
              )}
          </motion.button>
        ))}
      </div>

      {/* ── Explanation ── */}
      {answered && (
        <motion.div
          className="mt-5 rounded-lg border-l-4 border-accent-amber bg-accent-amber/5 p-4"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-sm text-text-primary/80">
            <strong className="text-accent-amber">Explanation:</strong>{" "}
            {question.explanation}
          </p>
        </motion.div>
      )}
    </div>
  );
}
