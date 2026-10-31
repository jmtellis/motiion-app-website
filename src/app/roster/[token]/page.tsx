import type { Metadata } from "next";
import Link from "next/link";
import { getSupabaseConfig } from "@/lib/supabaseRest";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Shared roster · Motiion",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
type Roster = { name: string; expiresAt: string | null; profileIds: string[] };
type Profile = { id: string; username: string | null; full_name: string | null; headshot_url: string | null; location: string | null; representation: string | null };

export default async function RosterPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const config = getSupabaseConfig();
  let roster: Roster | null = null;
  let profiles: Profile[] = [];
  let unavailable = false;
  if (config && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(token)) {
    const headers = { apikey: config.anon, Authorization: `Bearer ${config.anon}`, "Content-Type": "application/json" };
    try {
      const response = await fetch(`${config.supabaseUrl}/rest/v1/rpc/read_public_roster`, {
        method: "POST", headers, body: JSON.stringify({ p_token: token }), cache: "no-store",
      });
      if (!response.ok) throw new Error("Unavailable");
      roster = await response.json() as Roster | null;
      if (roster?.profileIds.length) {
        // Resolve only publicly readable profile fields with the anonymous key.
        // Batch large rosters so the URL stays below proxy limits.
        for (let offset = 0; offset < roster.profileIds.length; offset += 50) {
          const ids = roster.profileIds.slice(offset, offset + 50);
          const result = await fetch(`${config.supabaseUrl}/rest/v1/talent?id=in.(${ids.join(",")})&select=id,username,full_name,headshot_url,location,representation`, { headers, cache: "no-store" });
          if (!result.ok) throw new Error("Unavailable");
          profiles.push(...await result.json() as Profile[]);
        }
        profiles.sort((a, b) => roster!.profileIds.indexOf(a.id) - roster!.profileIds.indexOf(b.id));
      }
    } catch { unavailable = true; }
  }
  return <main style={{ minHeight: "100vh", background: "#f7f6f3", color: "#171717", padding: "48px 24px" }}>
    <div style={{ maxWidth: 1080, margin: "0 auto" }}>
      <Link href="/" style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.04em" }}>motiion</Link>
      <p style={{ marginTop: 48, fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase" }}>Shared roster</p>
      <h1 style={{ fontSize: "clamp(32px, 5vw, 56px)", lineHeight: 1.1, margin: "12px 0 20px" }}>{unavailable ? "Couldn't load this roster" : roster?.name ?? "This link is no longer available"}</h1>
      {!roster || unavailable ? <p>{unavailable ? "Please refresh to try again." : "It may have expired or been revoked. Ask the sender for a new link."}</p> : <>
        <p style={{ color: "#666", marginBottom: 32 }}>{profiles.length} {profiles.length === 1 ? "profile" : "profiles"} · View talent without a Motiion account</p>
        {profiles.length === 0 && <p>No public profiles are available in this roster yet.</p>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 24 }}>
          {profiles.map(profile => <Link key={profile.id} href={`/profile/${encodeURIComponent(profile.username || profile.id)}`} style={{ background: "white", borderRadius: 18, overflow: "hidden", textDecoration: "none", color: "inherit" }}>
            {profile.headshot_url ? <img src={profile.headshot_url} alt={profile.full_name || "Talent"} style={{ width: "100%", aspectRatio: "4 / 5", objectFit: "cover" }} /> : <div style={{ aspectRatio: "4 / 5", display: "grid", placeItems: "center", background: "#e9e7e2", fontSize: 48 }}>{profile.full_name?.slice(0, 1) || "M"}</div>}
            <div style={{ padding: 20 }}><h2 style={{ fontSize: 20, margin: "0 0 8px" }}>{profile.full_name || "Talent"}</h2><p style={{ color: "#666", fontSize: 14 }}>{[profile.representation, profile.location].filter(Boolean).join(" · ")}</p><p style={{ marginTop: 16, fontSize: 14 }}>View profile →</p></div>
          </Link>)}
        </div>
      </>}
    </div>
  </main>;
}
