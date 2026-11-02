import type { ReactNode } from "react";
import { ProductEmptyState } from "@/components/ui/EmptyState";

export function EmptyState({ title, description, actionLabel, actionHref, onAction, children }: {
  title: string; description: string; actionLabel?: string; actionHref?: string; onAction?: () => void; children?: ReactNode; variant?: "default" | "dashboard";
}) {
  return <ProductEmptyState title={title} description={description} actionLabel={actionLabel} actionHref={actionHref} onAction={onAction}>{children}</ProductEmptyState>;
}
