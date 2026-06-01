import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/landing/Footer";
import { getCurrentUserProfile } from "@/lib/auth/session";
import type { DashboardProfile } from "@/types/database";

export async function AuthPageShell({
  children,
  title,
  subtitle,
  profile: profileProp,
  /** When there is no page title, align the form from the top instead of vertically centering. */
  alignFromTop = false,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  profile?: DashboardProfile | null;
  alignFromTop?: boolean;
}) {
  const profile = profileProp ?? (await getCurrentUserProfile());
  const centered = !title;

  return (
    <div id="top" className="flex min-h-svh flex-col bg-[var(--paper)]">
      <AppHeader profile={profile} homeHref="/" centeredLogo={centered} />

      <main
        className={
          centered
            ? alignFromTop
              ? "mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-6 py-10 lg:px-10 lg:py-12"
              : "flex w-full flex-1 flex-col items-center justify-center px-6 py-10 lg:px-10"
            : "mx-auto w-full max-w-6xl flex-1 px-6 py-12 lg:px-10 lg:py-16"
        }
      >
        {title ? (
          <div className="mb-8 max-w-2xl">
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--ink)] md:text-4xl">{title}</h1>
            {subtitle ? (
              <p className="mt-3 text-base leading-relaxed text-[var(--ink-soft)]">{subtitle}</p>
            ) : null}
          </div>
        ) : null}
        {children}
      </main>

      <Footer />
    </div>
  );
}
