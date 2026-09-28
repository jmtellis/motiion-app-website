import Image from "next/image";
import { CREATIVE_HEADSHOT_PATHS } from "@/lib/marketing/creative-headshots";
import { talentSetupValueItems } from "@/lib/talent/copy";

/** Existing promotional portraits illustrate the profiles talent can build. */
export function ProfileSetupBenefits() {
  return (
    <div className="onboarding-profile-benefits">
      <div className="onboarding-profile-benefits__portraits" aria-hidden="true">
        {CREATIVE_HEADSHOT_PATHS.slice(0, 6).map((src) => (
          <div key={src} className="onboarding-profile-benefits__portrait">
            <Image src={src} alt="" fill sizes="(max-width: 480px) 56px, 72px" />
          </div>
        ))}
      </div>
      <ul className="onboarding-profile-benefits__list">
        {talentSetupValueItems.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}
