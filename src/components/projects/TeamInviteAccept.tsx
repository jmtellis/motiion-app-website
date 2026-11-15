"use client";
import {useSignOut} from "@/hooks/use-sign-out";
import {useRouter} from "next/navigation";
import {LoaderCircle} from "lucide-react";
import { useState,useTransition } from "react";
import { createClientSupabaseClient } from "@/lib/supabase/client";
export function TeamInviteAccept({token,email}:{token:string;email:string}) {
 const {signOut,pending:signingOut,error:signOutError}=useSignOut(`/team-invite/${encodeURIComponent(token)}`); const router=useRouter(); const [error,setError]=useState("");const [busy,start]=useTransition();
 return <><p>Signed in as {email}. This must match the invitation email.</p><button disabled={busy||signingOut} onClick={()=>start(async()=>{try{const db=createClientSupabaseClient();if(!db)throw new Error("Couldn’t connect.");const r=await db.rpc("join_featured_workspace",{p_token:token});if(r.error)throw r.error;router.push(`/team-projects/${r.data}`);}catch(e){setError(e && typeof e==="object" && "message" in e?String(e.message):"Couldn’t join. Verify that you’re signed in with the invited email.");}})}>{busy?<LoaderCircle className="animate-spin" aria-label="Joining project"/>:"Join project"}</button><button disabled={busy||signingOut} onClick={signOut}>Use a different account</button>{(error||signOutError)&&<p role="alert">{error||signOutError}</p>}</>;
}
