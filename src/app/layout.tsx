import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { TMAProvider } from "@/components/tma-provider";
import { Toaster } from "@/components/ui/sonner";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Meetlink – Find the Best Time",
  description: "Create a scheduling poll, share a link, and find when everyone is free.",
  openGraph: {
    title: "Meetlink – Find the Best Time",
    description: "Create a scheduling poll, share a link, and find when everyone is free.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ffffff",
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
      <body className={`${geist.variable} font-sans antialiased bg-background text-foreground`}>
        <TMAProvider>
          <main className="min-h-screen max-w-lg mx-auto px-4 py-6">{children}</main>
          <Toaster position="bottom-center" richColors />
        </TMAProvider>
      </body>
    </html>
  );
}
