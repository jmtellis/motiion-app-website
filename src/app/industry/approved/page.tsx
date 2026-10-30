import Link from "next/link";
import { getCurrentUserProfile } from "@/lib/auth/session";

export default async function IndustryApprovalEntryPage() {
  const profile = await getCurrentUserProfile();
  const destination = "/talent-buyers/application";
  const webHref = profile ? destination : `/login?next=${encodeURIComponent(destination)}`;
  return <main className="theme-dark theme-product flex min-h-screen items-center justify-center bg-[#0a0a0a] px-6 text-white">
    <section className="w-full max-w-md space-y-6 rounded-3xl border border-white/15 bg-white/5 p-8">
      <p className="text-sm text-white/60">Motiion Industry</p>
      <h1 className="text-3xl font-semibold">Your next project starts here</h1>
      <p className="text-white/70">Open Motiion to check your application and finish any remaining setup. Sign in with the account you used to apply.</p>
      <a className="block rounded-full bg-white px-6 py-3 text-center font-medium text-black" href="motiion://industry/approved">Open Motiion</a>
      <Link className="block text-center underline underline-offset-4" href={webHref}>Continue on web</Link>
    </section>
  </main>;
}
