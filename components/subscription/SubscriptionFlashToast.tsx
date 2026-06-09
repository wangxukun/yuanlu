"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

const STORAGE_KEY = "subscription_flash_message";

/**
 * Global component that checks sessionStorage on every route change for a
 * pending subscription activation message and displays it via sonner toast.
 *
 * This is needed because the subscribe page redirects after payment
 * activation, so an in-page banner cannot survive the navigation.
 * The message is written by SubscribeClient's polling logic and
 * consumed here on whichever page the user lands on after redirect.
 */
export default function SubscriptionFlashToast() {
  const pathname = usePathname();

  useEffect(() => {
    const message = sessionStorage.getItem(STORAGE_KEY);
    if (message) {
      sessionStorage.removeItem(STORAGE_KEY);
      // Small delay to ensure the page is fully rendered before toast shows
      setTimeout(() => {
        toast.success(message, {
          duration: 8000,
        });
      }, 500);
    }
  }, [pathname]);

  return null;
}
