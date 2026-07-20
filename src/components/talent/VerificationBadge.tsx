import { displayVerificationLabel } from "@/lib/talent-navigator/normalize-entity-name";

const TONE: Record<string, string> = {
  motiion_verified: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  industry_confirmed: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  document_supported: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  talent_reported: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
  ai_extracted: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  unverified: "bg-stone-500/15 text-stone-400 border-stone-500/30",
};

export function VerificationBadge({
  status,
  className = "",
}: {
  status: string;
  className?: string;
}) {
  const tone = TONE[status] ?? TONE.unverified;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wide ${tone} ${className}`}
      title={displayVerificationLabel(status)}
    >
      {displayVerificationLabel(status)}
    </span>
  );
}
