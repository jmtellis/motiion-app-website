import { requireHiringAccount } from "@/lib/auth/session";

/**
 * Industry tool routes. Feature-level Pro locks live on create/outreach actions;
 * free users can browse pages and hit upgrade dialogs when attempting Pro work.
 * Settings stays outside this group for billing access.
 */
export default async function PaidIndustryLayout({ children }: { children: React.ReactNode }) {
  await requireHiringAccount();
  return children;
}
