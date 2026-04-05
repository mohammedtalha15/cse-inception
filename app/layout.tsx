import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import { GeistPixelGrid } from "geist/font/pixel";
import { ThemeProvider } from "@/components/theme-provider";
import { AiChatDock } from "@/components/ai-chat-dock";

import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Ayuq — Context-Aware Hypoglycemia Risk Intelligence",
  description:
    "Predictive, context-aware hypoglycemia risk: trend + meals + insulin + activity + profile habits, time-to-threshold estimates, transparent factor scores, and Gemini-powered explanations — shifting care from reactive CGM alerts to early intervention.",
  keywords: [
    "hypoglycemia",
    "glucose",
    "diabetes",
    "risk prediction",
    "Gemini",
    "FastAPI",
    "Next.js",
    "explainable AI",
  ],
};

export const viewport: Viewport = {
  themeColor: "#0f0f0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jetbrainsMono.variable} ${GeistPixelGrid.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-screen font-mono antialiased">
        <ThemeProvider defaultTheme="dark">
          {children}
          <AiChatDock />
        </ThemeProvider>
      </body>
    </html>
  );
}
