import { AppleLogo } from "@/components/icons/AppleLogo";
import { iosHeroCta } from "@/lib/marketing/homepage-content";
import { getIosAppStoreUrl } from "@/lib/referrals/app-store";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function IosDownloadHeroButton({
  dark = false,
  iconOnly = false,
  className,
  variant = "secondary",
  label = iosHeroCta.label,
}: {
  dark?: boolean;
  iconOnly?: boolean;
  className?: string;
  label?: string;
  /** Quiet outlined companion by default; `primary` for standalone use. */
  variant?: "primary" | "secondary";
}) {
  void dark;

  return (
    <a
      href={getIosAppStoreUrl()}
      aria-label={iconOnly ? "Download Motiion on the App Store" : undefined}
      className={cn(
        "mkt-btn",
        variant === "primary" ? "mkt-btn--primary" : "mkt-btn--secondary",
        className,
      )}
    >
      <AppleLogo className="h-[1.125rem] w-[1.125rem] shrink-0" />
      {iconOnly ? null : label}
    </a>
  );
}
