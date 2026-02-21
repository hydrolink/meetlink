"use client";

import { useEffect, useState, type ReactNode } from "react";

let tmaInitialized = false;

function TMAInitializer() {
  useEffect(() => {
    if (tmaInitialized) return;
    tmaInitialized = true;

    async function initTMA() {
      try {
        const {
          isTMA,
          init,
          restoreInitData,
          miniApp,
          viewport,
          backButton,
          closingBehavior,
        } = await import("@telegram-apps/sdk-react");

        if (!isTMA()) return;

        init();
        restoreInitData();

        // Mount mini app component for styling methods
        if (miniApp.mountSync.isAvailable()) {
          miniApp.mountSync();
        }

        // Mount and expand viewport to full height
        if (viewport.mount.isAvailable()) {
          viewport.mount().then(() => {
            if (viewport.expand.isAvailable()) {
              viewport.expand();
            }
          });
        }

        // Back button: navigate browser history instead of closing the app
        if (backButton.mount.isAvailable()) {
          backButton.mount();
          backButton.onClick(() => {
            window.history.back();
          });
        }

        // Closing behavior: ask for confirmation to prevent accidental close
        if (closingBehavior.mount.isAvailable()) {
          closingBehavior.mount();
        }
        if (closingBehavior.enableConfirmation.isAvailable()) {
          closingBehavior.enableConfirmation();
        }
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
  const [user, setUser] = useState<{
    id: number;
    firstName: string;
    lastName?: string;
    username?: string;
  } | null>(null);

  useEffect(() => {
    async function getUser() {
      try {
        const { isTMA, retrieveLaunchParams } = await import("@telegram-apps/sdk-react");
        if (!isTMA()) return;
        const params = retrieveLaunchParams(true) as {
          initData?: { user?: { id: number; firstName: string; lastName?: string; username?: string } };
          startParam?: string;
        };
        const u = params?.initData?.user;
        if (u) {
          setUser({
            id: u.id,
            firstName: u.firstName,
            lastName: u.lastName,
            username: u.username,
          });
        }
      } catch {
        // Not in TMA context
      }
    }
    getUser();
  }, []);

  return user;
}

/**
 * Hook to safely read the Telegram launch start parameter.
 * This is the planId passed via deep link: t.me/bot/app?startapp=<planId>
 */
export function useTMAStartParam(): string | null {
  const [startParam, setStartParam] = useState<string | null>(null);

  useEffect(() => {
    async function getStartParam() {
      try {
        const { isTMA, retrieveLaunchParams } = await import("@telegram-apps/sdk-react");
        if (!isTMA()) return;
        const params = retrieveLaunchParams(true) as { startParam?: string };
        setStartParam(params?.startParam ?? null);
      } catch {
        // Not in TMA context
      }
    }
    getStartParam();
  }, []);

  return startParam;
}
