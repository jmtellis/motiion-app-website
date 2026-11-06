import { BuyerAppPage } from "@/components/talent-buyers/dashboard/BuyerAppPage";
import { LibraryPage } from "@/components/talent-buyers/library/LibraryPage";
import { listCollections, listSavedTalent } from "@/lib/talent-buyers/library";
import { requireHiringAccount } from "@/lib/auth/session";

export default async function BuyerLibraryRoute() {
  const profile = await requireHiringAccount();

  const [{ collections, error }, saved] = await Promise.all([listCollections(), listSavedTalent()]);
  const favorites = {
    count: saved.talent.length,
    people: saved.talent.slice(0, 4).map((person) => ({ id: person.id, name: person.name, avatarUrl: person.avatarUrl })),
  };

  return (
    <BuyerAppPage fullWidth className="!space-y-0 flex min-h-0 flex-1 flex-col">
      <LibraryPage key={profile.id} collections={collections} favorites={favorites} error={error ?? saved.error} />
    </BuyerAppPage>
  );
}
