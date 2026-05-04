"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import type { Quiz } from "@/types/quiz";

const QUESTION_COUNTS = [5, 10, 15, 20] as const;
const DIFFICULTIES = ["easy", "medium", "hard"] as const;

const difficultyStyles: Record<string, { active: string; label: string }> = {
  easy: {
    active: "border-accent-green bg-accent-green/10 text-accent-green",
    label: "Easy",
  },
  medium: {
    active: "border-accent-amber bg-accent-amber/10 text-accent-amber",
    label: "Medium",
  },
  hard: {
    active: "border-accent-red bg-accent-red/10 text-accent-red",
    label: "Hard",
  },
};

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
];
const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".doc", ".txt"];

export default function QuizForm() {
  const [material, setMaterial] = useState("");
  const [numQuestions, setNumQuestions] = useState<number>(10);
  const [difficulty, setDifficulty] = useState<string>("medium");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    // Validate file type
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setError("Unsupported file type. Please upload a PDF, DOCX, or TXT file.");
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("File is too large. Maximum size is 10 MB.");
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API_URL}/extract-text`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: "Upload failed" }));
        throw new Error(errData.detail || `Server error: ${res.status}`);
      }

      const data = await res.json();
      setMaterial(data.text);
      setUploadedFile(file.name);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed.";
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
    // Reset input so the same file can be re-uploaded
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const clearFile = () => {
    setUploadedFile(null);
    setMaterial("");
  };

  const handleSubmit = async () => {
    if (!material.trim()) {
      setError("Please enter a topic, paste material, or upload a file.");
      return;
    }

    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API_URL}/generate-quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          material: material.trim(),
          num_questions: numQuestions,
          difficulty,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: "Unknown error" }));
        throw new Error(errData.detail || `Server error: ${res.status}`);
      }

      const quiz: Quiz = await res.json();
      localStorage.setItem("active_quiz", JSON.stringify(quiz));
      setSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Connection failed.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* ── File Upload Zone ── */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text-primary">
          Upload Study Material{" "}
          <span className="text-text-secondary font-normal">(optional)</span>
        </label>

        {uploadedFile ? (
          <div className="flex items-center gap-3 rounded-lg border border-accent-green/30 bg-accent-green/5 px-4 py-3">
            <span className="text-lg">📄</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {uploadedFile}
              </p>
              <p className="text-xs text-accent-green">
                Text extracted successfully
              </p>
            </div>
            <button
              type="button"
              onClick={clearFile}
              className="rounded-md p-1 text-text-secondary hover:text-accent-red hover:bg-accent-red/10 transition-colors"
              title="Remove file"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ) : (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center cursor-pointer transition-all duration-200 ${
              uploading
                ? "border-accent-teal/40 bg-accent-teal/5"
                : "border-border hover:border-accent-teal/40 hover:bg-accent-teal/5"
            }`}
          >
            {uploading ? (
              <>
                <svg
                  className="h-8 w-8 animate-spin text-accent-teal"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="opacity-25"
                  />
                  <path
                    d="M4 12a8 8 0 018-8"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    className="opacity-75"
                  />
                </svg>
                <p className="text-sm text-accent-teal font-medium">
                  Extracting text...
                </p>
              </>
            ) : (
              <>
                <span className="text-3xl">📁</span>
                <p className="text-sm text-text-secondary">
                  <span className="font-semibold text-accent-blue">
                    Click to upload
                  </span>{" "}
                  or drag and drop
                </p>
                <p className="text-xs text-text-secondary/70">
                  PDF, DOCX, or TXT (max 10 MB)
                </p>
              </>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,.txt"
          onChange={handleFileChange}
          className="hidden"
          id="file-upload-input"
        />
      </div>

      {/* ── Divider ── */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-text-secondary">or type manually</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* ── Textarea ── */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text-primary">
          Topic or Study Material
        </label>
        <textarea
          id="quiz-material-input"
          rows={4}
          value={material}
          onChange={(e) => setMaterial(e.target.value)}
          placeholder="Enter a subject, topic, or paste your study material here..."
          className="edu-textarea"
        />
        {material && (
          <p className="mt-1 text-xs text-text-secondary">
            {material.length.toLocaleString()} characters
          </p>
        )}
      </div>

      {/* ── Question Count ── */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text-primary">
          Number of Questions
        </label>
        <div className="flex gap-2">
          {QUESTION_COUNTS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNumQuestions(n)}
              className={`flex-1 rounded-btn border px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                numQuestions === n
                  ? "border-accent-teal bg-accent-teal/10 text-accent-teal"
                  : "border-border text-text-secondary hover:border-accent-teal/40 hover:text-text-primary"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* ── Difficulty ── */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text-primary">
          Difficulty
        </label>
        <div className="flex gap-2">
          {DIFFICULTIES.map((d) => {
            const style = difficultyStyles[d];
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDifficulty(d)}
                className={`flex-1 rounded-btn border px-3 py-2.5 text-sm font-semibold capitalize transition-all duration-200 ${
                  difficulty === d
                    ? style.active
                    : "border-border text-text-secondary hover:border-text-secondary/50 hover:text-text-primary"
                }`}
              >
                {style.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <motion.div
          className="error-banner"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {error}
        </motion.div>
      )}

      {/* ── Success Banner ── */}
      {success && (
        <motion.div
          className="success-banner"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
        >
          ✅ Quiz is now live for students! Share the link:{" "}
          <strong>http://localhost:3000/student</strong>
        </motion.div>
      )}

      {/* ── Submit Button ── */}
      <button
        id="quiz-submit-btn"
        type="button"
        onClick={handleSubmit}
        disabled={loading || uploading}
        className="btn-lime w-full py-3"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="h-5 w-5 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                className="opacity-25"
              />
              <path
                d="M4 12a8 8 0 018-8"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                className="opacity-75"
              />
            </svg>
            Generating Quiz...
          </span>
        ) : (
          "Generate Quiz"
        )}
      </button>
    </div>
  );
}
