"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTMAStartParam } from "@/components/tma-provider";

/**
 * Reads the Telegram `startapp` parameter (planId) and redirects
 * to /plan/{planId} so deep-linked shares open the correct plan.
 */
export function StartParamRedirect() {
  const startParam = useTMAStartParam();
  const router = useRouter();

  useEffect(() => {
    if (startParam) {
      router.replace(`/plan/${startParam}`);
    }
  }, [startParam, router]);

  return null;
}
