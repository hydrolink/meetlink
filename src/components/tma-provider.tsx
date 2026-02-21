"use client";

import { useEffect, type ReactNode } from "react";
import { useLaunchParams } from "@tma.js/sdk-react";

function TMAInitializer() {
  useEffect(() => {
    // Dynamically initialize TMA SDK only on client, only when inside Telegram
    async function initTMA() {
      try {
        const { isTMA, init, viewport } = await import("@tma.js/sdk");
        if (!isTMA()) return;

        init({ acceptCustomStyles: true });

        // Mount and expand viewport to full height
        if (!viewport.isMounted()) {
          await viewport.mount();
        }
        viewport.expand();
      } catch {
        // Not in Telegram Mini App context — no-op
      }
    }
    initTMA();
  }, []);

  return null;
}

export function TMAProvider({ children }: { children: ReactNode }) {
  return (
    <>
      <TMAInitializer />
      {children}
    </>
  );
}

/**
 * Hook to safely read the Telegram user info from launch params.
 * Returns null when not in TMA context or on server.
 */
export function useTMAUser(): {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
} | null {
  try {
    const params = useLaunchParams(true) as unknown as {
      initData?: { user?: { id: number; firstName: string; lastName?: string; username?: string } };
    };
    const user = params?.initData?.user;
    if (!user) return null;
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
    };
  } catch {
    return null;
  }
}

/**
 * Hook to safely read the Telegram launch start parameter.
 * This is the planId passed via deep link: t.me/bot/app?startapp=<planId>
 */
export function useTMAStartParam(): string | null {
  try {
    const params = useLaunchParams(true) as unknown as { startParam?: string };
    return params?.startParam ?? null;
  } catch {
    return null;
  }
}
