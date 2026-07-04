import { CastingComposer } from "@/components/talent-buyers/casting/CastingComposer";
import { createDefaultCastingComposerForm } from "@/lib/talent-buyers/casting-composer-defaults";
import { requireHiringAccount } from "@/lib/auth/session";

export default async function NewCastingPage() {
  await requireHiringAccount();

  return <CastingComposer initialForm={createDefaultCastingComposerForm()} mode="create" />;
}
