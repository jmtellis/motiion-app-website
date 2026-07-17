import { notFound } from "next/navigation";

import { validateReferralToken } from "@/app/(buyer-app)/projects/[id]/casting-workflow/actions";
import { AnonymousCastingReferralForm } from "@/components/talent-buyers/casting/AnonymousCastingReferralForm";
import { ToastProvider } from "@/components/talent-buyers/dashboard/ToastProvider";

import "@/components/talent-buyers/casting/casting-workspace.css";

export default async function AnonymousCastingReferralPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const validated = await validateReferralToken(token);

  if (!validated.ok || !validated.castingTitle) {
    notFound();
  }

  return (
    <ToastProvider>
      <div className="casting-refer-page min-h-screen bg-[#0a0a0b] text-white">
        <AnonymousCastingReferralForm
          token={token}
          castingTitle={validated.castingTitle}
          castingDescription={validated.castingDescription}
          roles={validated.roles ?? []}
        />
      </div>
    </ToastProvider>
  );
}
