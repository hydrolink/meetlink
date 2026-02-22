"use client";

import { useEffect, useMemo, useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ShareButtonProps {
  planId: string;
  planTitle?: string;
  variant?: "default" | "outline";
  className?: string;
}

function buildTelegramDeepLink(planId: string): string | null {
  const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME;
  const appName = process.env.NEXT_PUBLIC_APP_NAME;
  if (!botUsername || !appName) return null;
  return `https://t.me/${botUsername}/${appName}?startapp=${planId}`;
}

function resolvePlanLink(planId: string): string {
  // Prefer Telegram deep link so recipients open the mini app directly.
  const tgLink = buildTelegramDeepLink(planId);
  if (tgLink) return tgLink;

  if (typeof window !== "undefined" && window.location.origin) {
    return `${window.location.origin}/plan/${planId}`;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    return `${appUrl.replace(/\/$/, "")}/plan/${planId}`;
  }

  return `/plan/${planId}`;
}

export function ShareButton({
  planId,
  planTitle,
  variant = "default",
  className,
}: ShareButtonProps) {
  const [canTelegramShare, setCanTelegramShare] = useState(false);
  const planLink = useMemo(() => resolvePlanLink(planId), [planId]);

  useEffect(() => {
    async function checkShareAvailability() {
      try {
        const { shareURL } = await import("@telegram-apps/sdk");
        setCanTelegramShare(shareURL.isAvailable());
      } catch {
        // Not in TMA context or SDK unavailable
      }
    }
    checkShareAvailability();
  }, []);

  async function handleTelegramShare() {
    try {
      const { shareURL } = await import("@telegram-apps/sdk");
      if (shareURL.isAvailable()) {
        shareURL(planLink, planTitle ? `Join my scheduling poll: ${planTitle}` : "Join my scheduling poll!");
      }
    } catch {
      toast.error("Could not open share dialog");
    }
  }

  async function handleNativeShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: planTitle ?? "Scheduling plan",
          text: planTitle ? `Join my scheduling poll: ${planTitle}` : "Join my scheduling poll!",
          url: planLink,
        });
      } catch {
        // User cancellation or browser rejection can be ignored.
      }
      return;
    }

    toast.error("Share is not available on this device");
  }

  if (canTelegramShare) {
    return (
      <div className={className}>
        <Button variant={variant} onClick={handleTelegramShare} className="w-full">
          <Share2 className="h-4 w-4 mr-2" />
          Share this plan
        </Button>
      </div>
    );
  }

  return (
    <Button variant={variant} onClick={handleNativeShare} className={className}>
      <Share2 className="h-4 w-4 mr-2" />
      Share this plan
    </Button>
  );
}
