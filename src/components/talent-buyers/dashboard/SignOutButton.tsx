"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClientSupabaseClient } from "@/lib/supabase/client";

export function SignOutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClientSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      className={`btn-outline text-sm ${className}`}
      onClick={handleSignOut}
      disabled={signingOut}
    >
      {signingOut ? "Signing out…" : "Sign out"}
    </button>
  );
}
