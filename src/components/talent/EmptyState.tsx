import { ProductEmptyState } from "@/components/ui/EmptyState";
import type { EmptyIllustrationName } from "@/components/ui/EmptyIllustration";

export function EmptyState({ title, description, action, illustration }: {
  title: string; description?: string; action?: { href: string; label: string } | { onClick?: never; href?: never; label: string };
  illustration?: EmptyIllustrationName;
}) {
  return <ProductEmptyState title={title} description={description} actionLabel={action?.label} actionHref={action?.href} illustration={illustration} />;
}
