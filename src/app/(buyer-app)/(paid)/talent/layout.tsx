import { TalentBuyerShell } from "@/components/talent-buyers/TalentBuyerShell";

import "./talent-buyer-shell.css";

export default function TalentBuyerLayout({ children }: { children: React.ReactNode }) {
  return <TalentBuyerShell>{children}</TalentBuyerShell>;
}
