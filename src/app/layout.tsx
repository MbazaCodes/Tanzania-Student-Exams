import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ExamHub — Papers Library & Exam Management",
  description: "Upload past papers, build exams & quizzes, auto-mark objective questions, review essays and publish results to students.",
  keywords: ["ExamHub", "exams", "papers", "NECTA", "quiz", "marking", "Tanzania"],
  authors: [{ name: "ExamHub" }],
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }, { url: "/favicon.svg", type: "image/svg+xml" }],
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}
