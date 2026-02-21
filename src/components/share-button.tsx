"use client";

import { useMemo, useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/utils";

interface ShareButtonProps {
  planId: string;
  planTitle?: string;
  variant?: "default" | "outline";
  className?: string;
}

function resolvePlanLink(planId: string): string {
  // Use runtime origin first so production always copies the active deployment URL.
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
  variant = "default",
  className,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const planLink = useMemo(() => resolvePlanLink(planId), [planId]);

  async function handleCopyLink() {
    try {
      await copyToClipboard(planLink);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  }

  return (
    <Button variant={variant} onClick={handleCopyLink} className={className}>
      {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
      {copied ? "Link Copied" : "Copy Link"}
    </Button>
  );
}
