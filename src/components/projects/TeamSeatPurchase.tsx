"use client";
import {useState,useTransition} from "react";
import {useRouter} from "next/navigation";
import {LoaderCircle} from "lucide-react";
import {previewTeamSeats,purchaseTeamSeats} from "@/lib/billing/team-seat-checkout";
export function TeamSeatPurchase({projectId,pass}:{projectId:string;pass:boolean}) {
 const router=useRouter();const [quantity,setQuantity]=useState(1);const [busy,start]=useTransition();const [message,setMessage]=useState("");
 const [quote,setQuote]=useState<Awaited<ReturnType<typeof previewTeamSeats>>|null>(null);
 return <details><summary>Add team seats</summary><p>{pass?"$39 per additional seat, for this project’s remaining Project Pass period. One-time payment; does not extend the pass.":"$15 per extra seat/month, renewing with your website Studio or Production House plan. Today’s charge is prorated. Extra seats are shared across your active projects."}</p><label>{pass?"Seats to add":"New total of extra monthly seats"}<input type="number" min={1} max={100} value={quantity} onChange={e=>{setQuantity(Number(e.target.value));setQuote(null);}}/></label>
 {!quote?.amount && quote?.amount!==0 ? <button disabled={busy} onClick={()=>start(async()=>{const q=await previewTeamSeats(projectId,quantity);setQuote(q);setMessage(q.error??"");})}>Review price</button> : <><p>{new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(quote.amount/100)} due now. {pass?`${quantity} seats added.`:`${quantity} extra seats total ($${quantity*15}/month).`}</p><button disabled={busy} onClick={()=>start(async()=>{const r=await purchaseTeamSeats(projectId,quantity,quote.current??0,quote.prorationDate??0);setMessage(r.error??r.message??"");if(r.url)window.location.assign(r.url);else if(!r.error){setQuote(null);router.refresh();}})}>Confirm {pass?"and pay in Stripe":"purchase"}</button></>}
 {busy&&<LoaderCircle className="animate-spin" aria-label="Loading"/>}{message&&<p role="status">{message}</p>}<p><a href="/dashboard/settings?section=billing">Manage billing</a></p></details>;
}
