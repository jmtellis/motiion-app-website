"use client";
import { CastingApplicationModal } from "@/components/casting/CastingApplicationModal";
export function CastingApplicationPreview({ step }: { step: "account" | "details" }) {
  return <main style={{ minHeight: "100vh", background: "#151515" }}><CastingApplicationModal preview={step} projectId="local-preview" roleId="00000000-0000-4000-8000-000000000000" roleTitle="Lead dancer" onClose={() => { window.location.href = "/"; }} onComplete={() => {}} /></main>;
}
