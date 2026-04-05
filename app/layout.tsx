import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import { GeistPixelGrid } from "geist/font/pixel";
import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Ayuq — Context-Aware Hypoglycemia Risk Intelligence",
  description:
    "Real-time hybrid risk scoring (rules + ML), live vitals simulation, and Gemini-powered explanations for hypoglycemia risk before it happens.",
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
      className={`${jetbrainsMono.variable} ${GeistPixelGrid.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen font-mono antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
