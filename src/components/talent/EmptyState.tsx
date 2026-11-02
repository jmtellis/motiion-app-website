import { ProductEmptyState } from "@/components/ui/EmptyState";

export function EmptyState({ title, description, action }: {
  title: string; description?: string; action?: { href: string; label: string } | { onClick?: never; href?: never; label: string };
}) {
  return <ProductEmptyState title={title} description={description} actionLabel={action?.label} actionHref={action?.href} />;
}
