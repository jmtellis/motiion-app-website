import { currentBlockedUsers } from "@/lib/app/blocked-visibility";
import Link from "next/link";
import Image from "next/image";
import { CalendarDays } from "lucide-react";
import { MarketingPageLayout } from "@/components/landing/MarketingPageLayout";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validCalendarDate } from "@/lib/app/calendar-events";

export async function CommunityActivitiesPage({ kind, query }: { kind: "classes" | "events"; query: { from?: string; q?: string; page?: string; week?: string } }) {
  const today = new Date().toISOString().slice(0, 10);
  const from = validCalendarDate(query.from) ? query.from : today;
  const page = Math.max(1, Math.min(400, Number.parseInt(query.page ?? "1", 10) || 1));
  const keyword = (query.q ?? "").trim().slice(0, 120);
  const [db, blocked] = await Promise.all([createServerSupabaseClient(), currentBlockedUsers()]);
  let request = db?.from("activities").select("id,title,type,activity_date,start_time,location,cover_image_url", { count: "exact" })
    .eq("status", "active").eq("is_private", false).in("type", kind === "classes" ? ["class", "session"] : ["event"])
    .gte("activity_date", from).order("activity_date").order("start_time", { nullsFirst: false }).order("id").range((page - 1) * 24, page * 24 - 1);
  if (blocked.ids.size) request = request?.not("creator_id", "in", `(${[...blocked.ids].join(",")})`);
  if (keyword) request = request?.ilike("title", `%${keyword.replace(/[\\%_]/g, "\\$&")}%`);
  if (query.week === "1") {
    const end = new Date(`${from}T12:00:00Z`); end.setUTCDate(end.getUTCDate() + 6);
    request = request?.lte("activity_date", end.toISOString().slice(0, 10));
  }
  const result = request && !blocked.error ? await request : null;
  const failed = !result || Boolean(result.error);
  const items = result?.data ?? [];
  function pageHref(next: number) { const params = new URLSearchParams({ from, q: keyword, page: String(next) }); if (query.week === "1") params.set("week", "1"); return `/community/${kind}?${params}`; }
  const title = kind === "classes" ? "Classes & sessions" : "Live events";
  return <MarketingPageLayout activeTab={null} homeHeader cleanHero heroSize="compact" hero={<div className="mx-auto w-full max-w-6xl px-6"><p className="type-eyebrow">Community</p><h1 className="type-display mt-3">{title}</h1><p className="mt-4 max-w-2xl text-[var(--ink-soft)]">{kind === "classes" ? "Find a class, train with other dancers, or join a session." : "Discover upcoming performances and gatherings. Open an event for its schedule and attendance details."}</p><nav aria-label="Community discovery" className="mt-6 flex flex-wrap gap-4"><Link href="/community/classes" aria-current={kind === "classes" ? "page" : undefined} className="underline">Classes & sessions</Link><Link href="/community/events" aria-current={kind === "events" ? "page" : undefined} className="underline">Live events</Link><Link href="/home" className="underline">My home</Link></nav></div>}>
    <section className="mx-auto max-w-6xl px-6 py-8 text-[var(--ink)]">
      <form className="mb-8 flex flex-wrap items-end gap-3"><label className="flex min-w-48 flex-1 flex-col gap-1 text-sm">Search<input name="q" defaultValue={keyword} maxLength={120} placeholder="Search by title" className="rounded-xl border border-[var(--line)] bg-white px-3 py-3" /></label><label className="flex flex-col gap-1 text-sm">From date<input name="from" type="date" defaultValue={from} className="rounded-xl border border-[var(--line)] bg-white px-3 py-3" /></label><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="week" value="1" defaultChecked={query.week === "1"} />Next 7 days</label><button type="submit" className="btn-primary min-h-11">Find activities</button></form>
      {failed ? <div role="alert" className="rounded-xl border border-rose-300 p-6">Listings could not be loaded. <Link href={pageHref(page)} className="underline">Retry</Link></div> : !items.length ? <div className="rounded-2xl border border-dashed border-[var(--line)] p-8"><h2 className="text-xl font-semibold">No activities match these dates</h2><p className="mt-2">Try a different date or clear your search.</p><Link href={`/community/${kind}`} className="mt-4 inline-block underline">Reset filters</Link></div> : <><p className="mb-4 text-sm text-[var(--ink-soft)]">{result?.count ?? items.length} matching activities</p><ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.map((item) => <li key={item.id}><Link href={`/activity/${item.id}`} className="group block h-full overflow-hidden rounded-2xl border border-[var(--line)] bg-white"><div className="relative aspect-[16/10] bg-[var(--paper)]">{item.cover_image_url ? <Image src={item.cover_image_url} fill alt="" sizes="(max-width:640px) 90vw, 33vw" className="object-cover" unoptimized /> : <CalendarDays className="absolute inset-0 m-auto size-12 text-[var(--ink-soft)]" aria-hidden />}</div><div className="p-5"><p className="text-xs capitalize text-[var(--ink-soft)]">{item.type}</p><h2 className="mt-2 text-xl font-semibold group-hover:underline">{item.title}</h2><p className="mt-2 text-sm">{new Date(`${item.activity_date}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric", year: "numeric" })}{item.start_time ? ` · ${item.start_time.slice(0,5)}` : " · All day"}</p><p className="mt-1 text-sm text-[var(--ink-soft)]">{item.location || "Location to be announced"}</p></div></Link></li>)}</ul></>}
      {!failed ? <nav aria-label="Listing pages" className="mt-8 flex items-center justify-between">{page > 1 ? <Link href={pageHref(page - 1)} className="underline">Previous</Link> : <span />}<span className="text-sm">Page {page}</span>{page * 24 < (result?.count ?? 0) ? <Link href={pageHref(page + 1)} className="underline">Next</Link> : <span />}</nav> : null}
    </section>
  </MarketingPageLayout>;
}
