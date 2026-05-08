import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Quiz } from "@/types/quiz";

interface LiveStudentViewProps {
  quiz: Quiz;
  liveState: any;
  userAnswers: string[];
  setUserAnswers: (ans: string[]) => void;
}

export default function LiveStudentView({ quiz, liveState, userAnswers, setUserAnswers }: LiveStudentViewProps) {
  const { phase, question_index } = liveState;
  const currentQuestion = quiz.questions[question_index];
  const myAnswer = userAnswers[question_index];
  
  const [submitting, setSubmitting] = useState(false);

  const handleAnswer = async (answer: string) => {
    if (myAnswer || submitting) return;
    setSubmitting(true);
    
    // Optimistic update
    const newAnswers = [...userAnswers];
    newAnswers[question_index] = answer;
    setUserAnswers(newAnswers);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const token = localStorage.getItem("student_token");
    
    try {
      await fetch(`${API_URL}/submit-answer`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ question_index, answer })
      });
    } catch {
      // Revert if failed (ignoring for simplicity in UI)
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-full flex-col items-center justify-center p-4">
      <AnimatePresence mode="wait">
        
        {phase === "lobby" && (
          <motion.div key="lobby" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center w-full max-w-md">
            <div className="bg-white/10 p-8 rounded-3xl backdrop-blur-md border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
              <span className="text-6xl mb-6 block">👍</span>
              <h2 className="text-3xl font-black text-white tracking-tight mb-2">You're in!</h2>
              <p className="text-[var(--text-secondary)] text-lg">See your nickname on screen</p>
              
              <div className="mt-8 flex justify-center gap-2">
                <span className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                <span className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                <span className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
              </div>
            </div>
          </motion.div>
        )}

        {phase === "question" && (
          <motion.div key="question" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full flex flex-col max-w-2xl">
            {myAnswer ? (
               <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mb-6">
                     <span className="text-4xl text-white font-black">{myAnswer}</span>
                  </div>
                  <h2 className="text-3xl font-bold text-white">Waiting for others...</h2>
               </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 flex-1 py-8">
                <button onClick={() => handleAnswer("A")} className="bg-[#ef4444] rounded-2xl shadow-[0_5px_15px_rgba(239,68,68,0.4)] active:scale-95 transition-transform" />
                <button onClick={() => handleAnswer("B")} className="bg-[#3b82f6] rounded-2xl shadow-[0_5px_15px_rgba(59,130,246,0.4)] active:scale-95 transition-transform" />
                <button onClick={() => handleAnswer("C")} className="bg-[#eab308] rounded-2xl shadow-[0_5px_15px_rgba(234,179,8,0.4)] active:scale-95 transition-transform" />
                <button onClick={() => handleAnswer("D")} className="bg-[#22c55e] rounded-2xl shadow-[0_5px_15px_rgba(34,197,94,0.4)] active:scale-95 transition-transform" />
              </div>
            )}
          </motion.div>
        )}

        {phase === "reveal" && currentQuestion && (
          <motion.div key="reveal" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md">
            {myAnswer === currentQuestion.correct ? (
              <div className="bg-[#22c55e] p-8 rounded-3xl text-center shadow-[0_20px_50px_rgba(34,197,94,0.4)] border border-white/20">
                <span className="text-6xl mb-4 block">🔥</span>
                <h2 className="text-4xl font-black text-white tracking-tight">Correct!</h2>
                <div className="mt-4 bg-black/20 rounded-xl py-2 px-4 inline-block text-white font-bold tracking-widest">+1000</div>
              </div>
            ) : (
              <div className="bg-[#ef4444] p-8 rounded-3xl text-center shadow-[0_20px_50px_rgba(239,68,68,0.4)] border border-white/20">
                <span className="text-6xl mb-4 block">❌</span>
                <h2 className="text-4xl font-black text-white tracking-tight">Incorrect</h2>
                <div className="mt-4 bg-black/20 rounded-xl py-2 px-4 inline-block text-white/80 font-bold">The answer was {currentQuestion.correct}</div>
              </div>
            )}
          </motion.div>
        )}

        {(phase === "leaderboard" || phase === "finished") && (
          <motion.div key="leaderboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center w-full max-w-md">
             <div className="bg-white/10 p-8 rounded-3xl backdrop-blur-md border border-white/10">
               <span className="text-6xl mb-6 block">🏆</span>
               <h2 className="text-3xl font-black text-white tracking-tight mb-2">Look at the screen!</h2>
             </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
