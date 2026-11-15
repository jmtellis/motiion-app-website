import Link from "next/link";
import { requireAuth } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
export default async function Page() {
 await requireAuth(); const db=await createServerSupabaseClient();
 const result=db ? await db.rpc("list_invited_team_projects") : null;
 if(!result || result.error) throw new Error("Couldn’t load your invited projects.");
 return <main className="mx-auto max-w-3xl space-y-6 p-8"><h1 className="text-3xl">Your team projects</h1><p>Project access is covered by the owner. Your other account settings stay separate.</p>{(result.data as {id:string;title:string;role:string}[]).map(p=><Link className="block rounded-xl border p-5" key={p.id} href={`/team-projects/${p.id}`}>{p.title} · {p.role}</Link>)}{!result.data.length && <p>No team projects yet. Open an invitation email to join.</p>}<Link href="/settings">Account settings</Link></main>;
}
