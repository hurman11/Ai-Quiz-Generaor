"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { Quiz } from "@/types/quiz";
import QuizQuestion from "@/components/QuizQuestion";
import ScoreCard from "@/components/ScoreCard";

export default function QuizPage() {
  const router = useRouter();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [quizDone, setQuizDone] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("active_quiz");
    if (!stored) {
      router.push("/");
      return;
    }
    try {
      const parsed: Quiz = JSON.parse(stored);
      setQuiz(parsed);
      setUserAnswers(new Array(parsed.questions.length).fill(""));
    } catch {
      router.push("/");
    }
  }, [router]);

  if (!quiz) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-text-secondary animate-pulse">
          Loading quiz...
        </p>
      </div>
    );
  }

  const totalQuestions = quiz.questions.length;
  const currentQuestion = quiz.questions[currentIndex];
  const progressPercent = ((currentIndex + (selectedAnswer ? 1 : 0)) / totalQuestions) * 100;

  const handleAnswer = (answer: string) => {
    if (selectedAnswer) return;
    setSelectedAnswer(answer);
    const updated = [...userAnswers];
    updated[currentIndex] = answer;
    setUserAnswers(updated);
  };

  const handleNext = () => {
    if (currentIndex + 1 >= totalQuestions) {
      setQuizDone(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
    }
  };

  const score = userAnswers.reduce((acc, ans, idx) => {
    return acc + (ans === quiz.questions[idx].correct ? 1 : 0);
  }, 0);

  if (quizDone) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-12">
        <motion.div
          className="w-full max-w-2xl"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <ScoreCard
            score={score}
            total={totalQuestions}
            questions={quiz.questions}
            userAnswers={userAnswers}
            onBackHome={() => router.push("/")}
          />
        </motion.div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-8 md:py-12">
      <div className="w-full max-w-2xl">
        {/* ── Header ── */}
        <motion.div
          className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="font-heading text-lg font-bold text-text-primary">
            {quiz.title}
          </h1>
          <span className="inline-flex items-center rounded-full bg-accent-teal/10 px-3 py-1 text-xs font-semibold text-accent-teal">
            Question {currentIndex + 1} of {totalQuestions}
          </span>
        </motion.div>

        {/* ── Progress Bar ── */}
        <div className="progress-bar-track mb-6">
          <div
            className="progress-bar-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* ── Question ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <QuizQuestion
              question={currentQuestion}
              onAnswer={handleAnswer}
              answered={selectedAnswer !== null}
              selectedAnswer={selectedAnswer}
            />
          </motion.div>
        </AnimatePresence>

        {/* ── Next Button ── */}
        {selectedAnswer && (
          <motion.div
            className="mt-5 flex justify-end"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <button
              id="quiz-next-btn"
              type="button"
              onClick={handleNext}
              className="btn-primary px-8 py-2.5"
            >
              {currentIndex + 1 >= totalQuestions
                ? "View Results"
                : "Next →"}
            </button>
          </motion.div>
        )}
      </div>
    </main>
  );
}
