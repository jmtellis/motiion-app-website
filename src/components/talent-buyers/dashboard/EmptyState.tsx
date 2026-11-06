import type { ReactNode } from "react";
import { ProductEmptyState } from "@/components/ui/EmptyState";
import type { EmptyIllustrationName } from "@/components/ui/EmptyIllustration";

export function EmptyState({ title, description, actionLabel, actionHref, onAction, children, illustration }: {
  title: string; description: string; actionLabel?: string; actionHref?: string; onAction?: () => void; children?: ReactNode; variant?: "default" | "dashboard";
  illustration?: EmptyIllustrationName;
}) {
  return <ProductEmptyState title={title} description={description} actionLabel={actionLabel} actionHref={actionHref} onAction={onAction} illustration={illustration}>{children}</ProductEmptyState>;
}
