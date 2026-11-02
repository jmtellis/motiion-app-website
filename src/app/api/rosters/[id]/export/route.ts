import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getCollection } from "@/lib/talent-buyers/library";
import { rosterPdf, rosterWorkbook } from "@/lib/talent-buyers/roster-export";
export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { collection, error } = await getCollection(id);
  const roster = collection ? { ...collection, kind: "roster", projectId: null } : null;
  if (!roster) {
    if (error === "Not signed in") return new Response("Sign in again to export this roster.", { status: 401 });
    if (error && !["Collection not found", "favorites"].includes(error)) return new Response("The roster could not be loaded. Please return to the roster and retry.", { status: 503 });
    return new Response("Roster not found", { status: 404 });
  }
  const format = new URL(request.url).searchParams.get("format");
  if (format !== "pdf" && format !== "xlsx") return new Response("Unsupported format", { status: 400 });
  const data = format === "xlsx" ? await rosterWorkbook(roster, process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin) : await rosterPdf(roster, await readFile(join(process.cwd(),"public/fonts/Geist-Regular.ttf")));
  const filename = (roster.name.replace(/[^a-zA-Z0-9 _-]/g, "").trim().slice(0,80) || "Roster") + "." + format;
  return new Response(new Uint8Array(data), { headers: { "Content-Type": format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store" } });
}
