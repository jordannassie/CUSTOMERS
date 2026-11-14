"use client";

import { useEffect } from "react";
import { isAuthApiError, isAuthSessionMissingError } from "@supabase/supabase-js";
import { sendToLogin } from "@/lib/session-expired";
import { createClient } from "@/lib/supabase/browser";

const RECHECK_MS = 30_000;

// REL-08: when the session ends (expired, revoked, logged out in another tab) the user goes to log in
// and comes back to this page, instead of meeting failed saves on a page that looks logged in.
export function SessionWatcher() {
  useEffect(() => {
    const supabase = createClient();
    let lastCheck = Date.now();

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") sendToLogin();
    });

    // A tab left open overnight only finds out when it is looked at again.
    async function recheck() {
      if (document.visibilityState !== "visible" || Date.now() - lastCheck < RECHECK_MS) return;
      lastCheck = Date.now();
      const { data: result, error } = await supabase.auth.getUser();
      // A network blip is not a logout; only a missing or rejected session is.
      if (!result.user && (isAuthSessionMissingError(error) || (isAuthApiError(error) && error.status < 500))) sendToLogin();
    }

    document.addEventListener("visibilitychange", recheck);
    window.addEventListener("focus", recheck);
    return () => {
      data.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", recheck);
      window.removeEventListener("focus", recheck);
    };
  }, []);

  return null;
}
