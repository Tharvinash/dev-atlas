import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DevAtlas — Jutro Context Navigator",
  description:
    "AI-powered context navigator for Guidewire Jutro frontend codebases. Pick a file, see what it does, who uses it, and what's risky to change.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-bg-base text-fg-primary antialiased">
        {children}
      </body>
    </html>
  );
}
