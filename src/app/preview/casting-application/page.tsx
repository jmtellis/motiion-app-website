import { notFound } from "next/navigation";
import { CastingApplicationPreview } from "./preview-client";
import "@/app/casting/casting.css";
export default async function Page({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  return <CastingApplicationPreview step={(await searchParams).step === "details" ? "details" : "account"} />;
}
