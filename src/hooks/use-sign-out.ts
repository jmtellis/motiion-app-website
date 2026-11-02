"use client";

import { useRef, useState } from "react";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import { signOutLocally } from "@/lib/auth/sign-out";

export function useSignOut(destination = "/") {
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function signOut() {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true); setError(null);
    try {
      const client = createClientSupabaseClient();
      if (!client) throw new Error("Sign out is unavailable.");
      // Hard navigation avoids router push/refresh racing against cached protected RSC.
      await signOutLocally(client.auth, () => window.location.replace(destination));
    } catch {
      setError("Couldn’t sign out. Check your connection and try again.");
      setPending(false); inFlight.current = false;
    }
  }
  return { signOut, pending, error };
}
