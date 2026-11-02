import { redirect } from "next/navigation";
/** Workshops and intensives use the supported class catalog; no separate program workflow. */
export default function ProgramsPage() {
  redirect("/community/classes");
}
