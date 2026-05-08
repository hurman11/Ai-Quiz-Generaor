import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexus | High-Octane AI Assessments",
  description:
    "Transform any document into a competitive, real-time assessment in seconds. Built for the modern classroom.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen text-text-primary antialiased bg-transparent">
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
