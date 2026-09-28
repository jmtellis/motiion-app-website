"use server";

import { queryCreditCollaborators } from "@/lib/talent-navigator/search-navigator-rpc";

export async function suggestCreditCollaborators(query: string): Promise<string[]> {
  return queryCreditCollaborators(query);
}
