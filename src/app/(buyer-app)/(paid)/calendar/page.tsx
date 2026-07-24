import { redirect } from "next/navigation";

/** Calendar lives under Events → Schedule. */
export default function BuyerCalendarRedirectPage() {
  redirect("/events?view=schedule");
}
