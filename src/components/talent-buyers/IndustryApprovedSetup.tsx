"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Compass, Clapperboard, CalendarDays, Check } from "lucide-react";
import { CenteredAuthShell } from "@/components/auth/CenteredAuthShell";
import { completeApprovedIndustrySetup } from "@/app/talent-buyers/onboarding/actions";
export function IndustryApprovedSetup({ name, username: initialUsername }: { name: string; username: string | null }) {
  const router = useRouter();
  const [username, setUsername] = useState(initialUsername ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  return <CenteredAuthShell showAlternateAuth={false} mode="signup" title="You’re approved" subtitle={`Welcome, ${name}. Your reviewed details are ready to use.`}>
    <div className="signup-split-form__body flex flex-col gap-6">
      <div className="flex items-center justify-center gap-2 text-sm"><Check size={18} aria-hidden /> Industry access approved</div>
      <ul className="grid gap-5">{[{ icon: Compass, title: "Discover talent", copy: "Find the right people and save them to your rosters." }, { icon: Clapperboard, title: "Run your casting", copy: "Publish roles, review submissions, and make your selections." }, { icon: CalendarDays, title: "Coordinate projects", copy: "Keep your cast, conversations, and schedule in one place." }].map(({ icon: Icon, title, copy }) => <li key={title} className="flex gap-4"><Icon className="mt-1 shrink-0" size={22} aria-hidden /><div><h2 className="font-semibold">{title}</h2><p className="signup-split-hint">{copy}</p></div></li>)}</ul>
      {!initialUsername && <label className="signup-split-field"><span>Choose a username</span><input value={username} autoComplete="username" maxLength={30} onChange={event => setUsername(event.target.value.toLowerCase().replace(/^@/, ""))} /><small className="signup-split-hint">3–30 lowercase letters, numbers, or underscores.</small></label>}
      {error && <p className="signup-split-error" role="alert">{error}</p>}
      <button className="signup-split-submit" disabled={busy || !/^[a-z0-9_]{3,30}$/.test(username)} onClick={() => { setError(null); startTransition(async () => { try { const result = await completeApprovedIndustrySetup(username); if (!result.ok) { setError(result.error); return; } router.replace(result.redirectTo); router.refresh(); } catch { setError("Couldn’t finish setup. Your approval is safe; please try again."); } }); }}>{busy ? "Opening your workspace…" : "Enter Motiion"}</button>
      <p className="signup-split-hint">Your free workspace is ready. You can manage optional Pro features in settings.</p>
    </div>
  </CenteredAuthShell>;
}
