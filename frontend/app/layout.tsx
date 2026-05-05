import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import ParticleBackground from "@/components/ParticleBackground";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "QuizGen — AI-Powered Quiz Generator for Classrooms",
  description:
    "Generate AI-powered quizzes on any subject. Teachers create, students take — all in a modern, friendly classroom experience.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-bg-base text-text-primary antialiased font-body">
        <ParticleBackground />
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
