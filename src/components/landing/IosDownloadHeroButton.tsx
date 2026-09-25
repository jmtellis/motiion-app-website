import { AppleLogo } from "@/components/icons/AppleLogo";
import { iosHeroCta } from "@/lib/marketing/homepage-content";
import { getIosAppStoreUrl } from "@/lib/referrals/app-store";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function IosDownloadHeroButton({
  dark = false,
  className,
  variant = "secondary",
  label = iosHeroCta.label,
}: {
  dark?: boolean;
  className?: string;
  label?: string;
  /** Quiet outlined companion by default; `primary` for standalone use. */
  variant?: "primary" | "secondary";
}) {
  void dark;

  return (
    <a
      href={getIosAppStoreUrl()}
      className={cn(
        "mkt-btn",
        variant === "primary" ? "mkt-btn--primary" : "mkt-btn--secondary",
        className,
      )}
    >
      <AppleLogo className="h-[1.125rem] w-[1.125rem] shrink-0" />
      {label}
    </a>
  );
}
