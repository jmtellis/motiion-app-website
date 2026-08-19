import { AppleLogo } from "@/components/icons/AppleLogo";
import { iosHeroCta } from "@/lib/marketing/homepage-content";
import { getIosAppStoreUrl } from "@/lib/referrals/app-store";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function IosDownloadHeroButton({
  dark = false,
  className,
  variant = "accent",
}: {
  dark?: boolean;
  className?: string;
  /** `ghost` for outline-style CTA on dark split landing. */
  variant?: "accent" | "ghost";
}) {
  void dark;

  return (
    <a
      href={getIosAppStoreUrl()}
      className={cn(
        "btn-hero-pill w-full sm:w-auto sm:min-w-[11rem]",
        variant === "ghost" ? "btn-hero-pill-ghost" : "btn-hero-pill-accent",
        className,
      )}
    >
      <AppleLogo className="h-[1.125rem] w-[1.125rem] shrink-0" />
      {iosHeroCta.label}
    </a>
  );
}
