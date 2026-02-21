"use client";

import { useState } from "react";
import { Share2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/utils";

interface ShareButtonProps {
  planId: string;
  planTitle?: string;
  variant?: "default" | "outline";
  className?: string;
}

export function ShareButton({
  planId,
  planTitle,
  variant = "default",
  className,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME ?? "";
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "meetlink";

  // Deep link for Telegram Mini App
  const tmaDeepLink =
    botUsername
      ? `https://t.me/${botUsername}/${appName}?startapp=${planId}`
      : `${appUrl}/plan/${planId}`;

  const webLink = `${appUrl}/plan/${planId}`;
  const shareText = planTitle
    ? `Join my scheduling poll: "${planTitle}"`
    : "Join my scheduling poll on Meetlink";

  async function handleShare() {
    // Check if running inside Telegram Mini App
    const tg = (window as unknown as { Telegram?: { WebApp?: { openTelegramLink?: (url: string) => void } } })
      ?.Telegram?.WebApp;

    if (tg?.openTelegramLink) {
      // Use Telegram native share sheet
      tg.openTelegramLink(
        `https://t.me/share/url?url=${encodeURIComponent(tmaDeepLink)}&text=${encodeURIComponent(shareText)}`
      );
      return;
    }

    // Web Share API (mobile browsers)
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Meetlink",
          text: shareText,
          url: tmaDeepLink,
        });
        return;
      } catch {
        // User cancelled or not supported — fall through to clipboard
      }
    }

    // Fallback: copy to clipboard
    try {
      await copyToClipboard(tmaDeepLink);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  }

  async function handleCopyWebLink() {
    try {
      await copyToClipboard(webLink);
      setCopied(true);
      toast.success("Web link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  }

  return (
    <div className="flex gap-2">
      <Button variant={variant} onClick={handleShare} className={className}>
        {copied ? <Check className="h-4 w-4 mr-2" /> : <Share2 className="h-4 w-4 mr-2" />}
        Share Plan
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={handleCopyWebLink}
        aria-label="Copy web link"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}
