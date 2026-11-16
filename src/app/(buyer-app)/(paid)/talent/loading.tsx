import { DiscoverPageSkeleton } from "@/components/app/DiscoverSkeletons";

export default function TalentLoading() {
  return (
    <div className="talent-navigator-route">
      <DiscoverPageSkeleton mode="navigator" />
    </div>
  );
}
