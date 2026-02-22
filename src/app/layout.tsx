import type { Metadata, Viewport } from "next";
import { Manrope, Sora } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { TMAProvider } from "@/components/tma-provider";
import { Toaster } from "@/components/ui/sonner";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Meetlink - Find the Best Time",
  description: "Create a scheduling poll, share a link, and find when everyone is free.",
  openGraph: {
    title: "Meetlink - Find the Best Time",
    description: "Create a scheduling poll, share a link, and find when everyone is free.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  userScalable: true,
  themeColor: "#f6efe3",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          CRITICAL: Load Telegram WebApp script BEFORE React hydration.
          Without beforeInteractive, window.Telegram.WebApp is undefined during TMA SDK init.
        */}
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>
      <body
        className={`${manrope.variable} ${sora.variable} font-sans antialiased bg-background text-foreground`}
      >
        <TMAProvider>
          <main className="app-shell min-h-screen mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-7">
            {children}
          </main>
          <Toaster position="bottom-center" richColors />
        </TMAProvider>
      </body>
    </html>
  );
}
