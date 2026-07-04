"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

import { unlockCasting } from "@/app/casting/[id]/access";

export function CastingPasswordGate({ roleId, title }: { roleId: string; title: string | null }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await unlockCasting(roleId, password);
      if (!result.ok) {
        setError(result.error ?? "Could not unlock this casting.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0a0a] p-6">
      <form
        className="w-full max-w-sm space-y-4 rounded-2xl border border-white/10 bg-white/4 p-8 text-center"
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
      >
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-white/8">
          <Lock className="size-5 text-white/70" aria-hidden />
        </span>
        <div>
          <h1 className="text-lg font-semibold text-white">Private casting</h1>
          <p className="mt-1 text-sm text-white/55">
            {title ? `“${title}” is password protected.` : "This casting is password protected."} Enter
            the password shared by the organizer.
          </p>
        </div>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Casting password"
          autoFocus
          className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-2.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-white/40"
        />
        {error ? <p className="text-sm text-amber-300">{error}</p> : null}
        <button
          type="submit"
          disabled={isPending || !password.trim()}
          className="w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#0a0a0a] hover:bg-white/90 disabled:opacity-40"
        >
          {isPending ? "Checking…" : "View casting"}
        </button>
      </form>
    </main>
  );
}
