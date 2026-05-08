import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Quiz } from "@/types/quiz";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface HostViewProps {
  activeQuiz: Quiz;
  setActiveQuiz: (quiz: Quiz | null) => void;
  results: any[];
  registeredCount: number;
}

export default function HostView({ activeQuiz, setActiveQuiz, results, registeredCount }: HostViewProps) {
  const updateState = async (newState: any) => {
    const updatedQuiz = { ...activeQuiz, live_state: newState };
    setActiveQuiz(updatedQuiz);
    localStorage.setItem("active_quiz", JSON.stringify(updatedQuiz));
    
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    try {
      await fetch(`${API_URL}/active-quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedQuiz),
      });
    } catch {
      // ignore
    }
  };

  const handleStopHosting = async () => {
    const updatedQuiz = { ...activeQuiz };
    delete updatedQuiz.live_state;
    setActiveQuiz(updatedQuiz);
    localStorage.setItem("active_quiz", JSON.stringify(updatedQuiz));
    
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    try {
      await fetch(`${API_URL}/active-quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedQuiz),
      });
    } catch {
      // ignore
    }
  };

  const handleNextQuestion = () => {
    const idx = activeQuiz.live_state?.phase === "lobby" ? 0 : (activeQuiz.live_state?.question_index || 0) + 1;
    if (idx >= activeQuiz.questions.length) {
      updateState({ phase: "finished", question_index: idx, start_time: Date.now() });
    } else {
      updateState({ phase: "question", question_index: idx, start_time: Date.now() });
    }
  };

  const handleReveal = () => {
    updateState({ ...activeQuiz.live_state, phase: "reveal" });
  };

  const handleLeaderboard = () => {
    updateState({ ...activeQuiz.live_state, phase: "leaderboard" });
  };

  const { phase, question_index } = activeQuiz.live_state || { phase: "lobby", question_index: 0 };
  const currentQuestion = activeQuiz.questions[question_index];

  // Tally answers for the current question
  const getAnswerTally = () => {
    let a = 0, b = 0, c = 0, d = 0;
    results.forEach(r => {
      try {
        const details = typeof r.question_details === 'string' ? JSON.parse(r.question_details) : r.question_details;
        if (details && details[question_index]) {
          const ans = details[question_index];
          if (ans === "A") a++;
          if (ans === "B") b++;
          if (ans === "C") c++;
          if (ans === "D") d++;
        }
      } catch { /* ignore */ }
    });
    return [
      { name: "A", count: a, fill: "#ef4444" },
      { name: "B", count: b, fill: "#3b82f6" },
      { name: "C", count: c, fill: "#eab308" },
      { name: "D", count: d, fill: "#22c55e" },
    ];
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0f172a] overflow-hidden flex flex-col">
      <div className="absolute inset-0 bg-gradient-to-br from-[#1e1b4b]/80 via-[#0f172a] to-[#020617] pointer-events-none" />
      
      {/* Header */}
      <header className="relative z-10 p-6 flex justify-between items-center bg-black/20 backdrop-blur-md border-b border-white/10">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">{activeQuiz.title}</h1>
          <p className="text-[var(--accent-cyan)] font-mono mt-1">Game Pin: <span className="font-bold text-2xl">{activeQuiz.quiz_code}</span></p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
            <span className="text-white font-bold">{registeredCount}</span>
            <span className="text-white/50 text-sm">Players</span>
          </div>
          <button onClick={handleStopHosting} className="btn-danger text-sm py-2">Exit Host Mode</button>
        </div>
      </header>

      {/* Main Stage */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-8">
        <AnimatePresence mode="wait">
          
          {phase === "lobby" && (
            <motion.div key="lobby" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="text-center">
              <h2 className="text-5xl font-black text-white mb-8">Join at <span className="text-[var(--accent-cyan)] underline">ai-quiz-generaor.vercel.app</span></h2>
              <div className="text-9xl font-black text-white font-mono tracking-widest drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]">
                {activeQuiz.quiz_code}
              </div>
              <div className="mt-16">
                <button onClick={handleNextQuestion} className="px-12 py-6 bg-white text-black text-3xl font-black rounded-full hover:scale-105 transition-transform shadow-[0_0_40px_rgba(255,255,255,0.3)]">
                  START GAME
                </button>
              </div>
            </motion.div>
          )}

          {phase === "question" && currentQuestion && (
            <motion.div key="question" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full max-w-6xl flex flex-col h-full">
              <div className="text-center mb-12">
                <span className="text-[var(--accent-amber)] font-bold tracking-widest uppercase mb-4 block">Question {question_index + 1} of {activeQuiz.questions.length}</span>
                <h2 className="text-4xl md:text-6xl font-bold text-white leading-tight">{currentQuestion.question}</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-4 md:gap-6 flex-1 max-h-[400px]">
                <div className="bg-[#ef4444] rounded-2xl flex items-center justify-center p-8 shadow-[0_10px_30px_rgba(239,68,68,0.3)]">
                  <span className="text-white text-3xl font-bold drop-shadow-md">{currentQuestion.options.A}</span>
                </div>
                <div className="bg-[#3b82f6] rounded-2xl flex items-center justify-center p-8 shadow-[0_10px_30px_rgba(59,130,246,0.3)]">
                  <span className="text-white text-3xl font-bold drop-shadow-md">{currentQuestion.options.B}</span>
                </div>
                <div className="bg-[#eab308] rounded-2xl flex items-center justify-center p-8 shadow-[0_10px_30px_rgba(234,179,8,0.3)]">
                  <span className="text-white text-3xl font-bold drop-shadow-md">{currentQuestion.options.C}</span>
                </div>
                <div className="bg-[#22c55e] rounded-2xl flex items-center justify-center p-8 shadow-[0_10px_30px_rgba(34,197,94,0.3)]">
                  <span className="text-white text-3xl font-bold drop-shadow-md">{currentQuestion.options.D}</span>
                </div>
              </div>

              <div className="mt-12 flex justify-end">
                <button onClick={handleReveal} className="btn-primary text-xl px-10 py-4">Skip & Show Results</button>
              </div>
            </motion.div>
          )}

          {phase === "reveal" && currentQuestion && (
            <motion.div key="reveal" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-5xl flex flex-col h-full items-center">
              <h2 className="text-3xl text-white font-bold mb-4">{currentQuestion.question}</h2>
              <div className="bg-white/10 rounded-2xl p-6 border border-[var(--accent-green)] text-[var(--accent-green)] text-2xl font-bold mb-12 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
                Correct Answer: {currentQuestion.correct}
              </div>
              
              <div className="w-full h-[400px] bg-black/20 rounded-3xl p-8 backdrop-blur-sm border border-white/5">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getAnswerTally()}>
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" tick={{fill: 'white', fontSize: 24, fontWeight: 'bold'}} />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-8 flex gap-4">
                <button onClick={handleLeaderboard} className="btn-outline text-xl px-8 py-4">Show Leaderboard</button>
                <button onClick={handleNextQuestion} className="btn-primary text-xl px-8 py-4">Next Question</button>
              </div>
            </motion.div>
          )}

          {phase === "leaderboard" && (
            <motion.div key="leaderboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-4xl text-center">
              <h2 className="text-6xl font-black text-white mb-12 tracking-tight">Top Players</h2>
              <div className="flex flex-col gap-4">
                {results.sort((a,b) => b.score - a.score).slice(0, 5).map((r, i) => (
                  <div key={i} className="flex items-center justify-between bg-white/10 p-6 rounded-2xl border border-white/10 backdrop-blur-sm">
                    <div className="flex items-center gap-6">
                      <span className="text-4xl font-black text-white/50 w-12">{i + 1}</span>
                      <span className="text-3xl font-bold text-white">{r.student_name}</span>
                    </div>
                    <span className="text-3xl font-black text-[var(--accent-cyan)]">{r.score * 1000}</span>
                  </div>
                ))}
              </div>
              <div className="mt-12">
                <button onClick={handleNextQuestion} className="btn-primary text-2xl px-12 py-5">Next Question</button>
              </div>
            </motion.div>
          )}

          {phase === "finished" && (
            <motion.div key="finished" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <h2 className="text-7xl font-black text-white mb-6">Podium</h2>
              <div className="flex items-end justify-center gap-4 h-[400px] mt-12">
                {/* 2nd Place */}
                {results.length > 1 && (
                  <div className="flex flex-col items-center">
                    <span className="text-2xl text-white font-bold mb-4">{results[1]?.student_name}</span>
                    <div className="w-32 h-[200px] bg-[#c0c0c0] rounded-t-lg flex justify-center items-start pt-4 shadow-[0_0_30px_rgba(192,192,192,0.3)]">
                      <span className="text-5xl font-black text-black/50">2</span>
                    </div>
                  </div>
                )}
                {/* 1st Place */}
                {results.length > 0 && (
                  <div className="flex flex-col items-center">
                    <span className="text-3xl text-white font-black mb-4">{results[0]?.student_name}</span>
                    <div className="w-40 h-[300px] bg-[#ffd700] rounded-t-lg flex justify-center items-start pt-4 shadow-[0_0_50px_rgba(255,215,0,0.4)] z-10">
                      <span className="text-7xl font-black text-black/50">1</span>
                    </div>
                  </div>
                )}
                {/* 3rd Place */}
                {results.length > 2 && (
                  <div className="flex flex-col items-center">
                    <span className="text-2xl text-white font-bold mb-4">{results[2]?.student_name}</span>
                    <div className="w-32 h-[150px] bg-[#cd7f32] rounded-t-lg flex justify-center items-start pt-4 shadow-[0_0_30px_rgba(205,127,50,0.3)]">
                      <span className="text-5xl font-black text-black/50">3</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-16">
                <button onClick={handleStopHosting} className="btn-outline text-xl px-8 py-4">Exit Game</button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
