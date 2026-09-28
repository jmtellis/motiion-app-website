import Link from "next/link";
import { MessageCircle } from "lucide-react";
import {
  IndustryEmptyState,
  IndustryJourney,
  IndustryPageHeader,
} from "@/components/talent-buyers/dashboard/IndustryUI";
export function InboxEmptyState({ hideHeader = false }: { hideHeader?: boolean }) {
  return (
    <div className="industry-inbox-intro">
      {hideHeader ? null : (
        <IndustryPageHeader
          eyebrow="Stay connected"
          title="Inbox"
          description="The conversation behind every great collaboration."
        />
      )}
      <IndustryEmptyState
        icon={<MessageCircle size={25} />}
        title="Start a conversation. Build a connection."
        description="Reach out from a dancer’s profile. Your conversations will be here when you’re ready to work out the details."
        actions={
          <Link href="/talent" className="buyer-chrome-bar__cta">
            Find talent
          </Link>
        }
      >
        <IndustryJourney
          steps={[
            {
              title: "Find your people",
              description:
                "Explore dancers and open a profile that catches your eye.",
            },
            {
              title: "Make the introduction",
              description: "Share the opportunity and start a conversation.",
            },
            {
              title: "Keep it moving",
              description:
                "Return here to discuss availability and next steps.",
            },
          ]}
        />
      </IndustryEmptyState>
    </div>
  );
}
