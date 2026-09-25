import { DesignSystemGallery } from "@/components/admin/design-system/DesignSystemGallery";
import { CATALOG_SAMPLE_PROFILE } from "@/lib/design-system/sample-media";

export const metadata = {
  title: "Design system · Admin · Motiion",
  robots: { index: false, follow: false },
};

export default function DesignSystemAdminPage() {
  return <DesignSystemGallery sample={CATALOG_SAMPLE_PROFILE} />;
}
