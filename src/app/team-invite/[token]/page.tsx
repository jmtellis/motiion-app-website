import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { TeamInviteAccept } from "@/components/projects/TeamInviteAccept";
import "@/components/projects/project-team.css";
export default async function Page({params}:{params:Promise<{token:string}>}) {
 const {token}=await params; const db=await createServerSupabaseClient();
 const card=db ? await db.rpc("get_workspace_invite_card",{p_token:token}) : null;
 const user=db ? (await db.auth.getUser()).data.user : null;
 if(!card?.data?.ok || !["admin","coordinator"].includes(card.data.invitation_role))return <main className="project-team"><h1>Invitation unavailable</h1><p>This invitation may have expired or been revoked. Ask the project owner to resend it.</p><Link href="/team-projects">Your team projects</Link></main>;
 const next=encodeURIComponent(`/team-invite/${token}`);
 return <main className="project-team"><h1>Join {card.data.workspace_title}</h1><p>{card.data.inviter_name} invited you as a project {card.data.invitation_role}. Your access is covered by the owner. No separate paid plan or industry application is required.</p><p>{card.data.invitation_role==="coordinator"?"You can edit dates, times and locations. Casting decisions, rates, contracts, billing and permissions are not included.":"You can manage this project’s casting and collaboration. Billing and team permissions stay with the owner."}</p>{user ? <TeamInviteAccept token={token} email={user.email??""}/> : <><Link href={`/signup?account_type=talent&next=${next}`}>Create your account</Link> <Link href={`/login?next=${next}`}>Sign in</Link><p>Use the email address that received the invitation. You’ll verify your email before joining.</p></>}<p><a href={`motiion://www.motiion.app/featured-invite/${token}`}>Open invitation in the iOS app</a></p></main>;
}
