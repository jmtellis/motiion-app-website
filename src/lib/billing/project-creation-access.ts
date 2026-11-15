import { receiptIsActive, type ProjectAccess } from "./project-catalog";

/** Advisory UI check; the database locks and allocates capacity on insert. */
export function canCreatePaidProject(access: ProjectAccess): boolean {
  return access.monthly_limit > access.active_projects || access.purchases.some(
    receipt => receipt.plan === "project_pass" && !receipt.project_id && !receipt.activated_at && receiptIsActive(receipt),
  );
}
