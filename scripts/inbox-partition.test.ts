import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  classifyConversationPartition,
  conversationsWithInboxActivity,
  filterForOpening,
  formatInboxTimestamp,
  inboxDisplayName,
  inboxNavBadgeCount,
  isGroupThread,
  isMotiionBrandedThread,
  isOneWayMotiionThread,
  partitionUnreadCount,
  requestsChipCount,
} from "../src/lib/messaging/inbox-partition";
import type { InboxConversation } from "../src/types/app";

function conversation(partial: Partial<InboxConversation> & { conversation_id: string }): InboxConversation {
  return {
    type: "direct",
    context_type: null,
    context_id: null,
    context_title: null,
    participant_user_id: "peer",
    participant_name: "Alex",
    participant_role: "dancer",
    participant_avatar_url: null,
    last_message_body: "Hey",
    last_message_at: "2026-09-27T18:00:00.000Z",
    last_message_sender_id: "peer",
    unread_count: 0,
    muted: false,
    ...partial,
  };
}

describe("conversation partitions", () => {
  it("puts a choreographer one-to-one in Primary", () => {
    const row = conversation({
      conversation_id: "1",
      context_type: "agency",
      participant_name: "Jordan Cast",
      participant_role: "choreographer",
    });
    assert.equal(classifyConversationPartition(row), "primary");
    assert.equal(filterForOpening(row), "primary");
  });

  it("puts talent one-to-one outreach in General", () => {
    const row = conversation({
      conversation_id: "2",
      type: "agent",
      context_type: "agency",
      participant_role: "dancer",
    });
    assert.equal(classifyConversationPartition(row), "general");
    assert.equal(filterForOpening(row), "general");
  });

  it("puts a titled activity group in Primary", () => {
    const row = conversation({
      conversation_id: "3",
      type: "event",
      context_type: "event",
      context_title: "Showcase",
      participant_user_id: null,
      participant_name: "Showcase Attendees",
      participant_role: null,
    });
    assert.equal(classifyConversationPartition(row), "primary");
    assert.equal(isGroupThread(row), true);
  });

  it("puts a shared class one-to-one in Primary even for a dancer", () => {
    const row = conversation({
      conversation_id: "4",
      type: "class",
      context_type: "class",
      context_title: "Hip Hop",
      participant_role: "dancer",
    });
    assert.equal(classifyConversationPartition(row), "primary");
  });

  it("keeps profile review in General and brands it Motiion", () => {
    const row = conversation({
      conversation_id: "5",
      context_type: "profile_review",
      participant_name: "Admin User",
      participant_role: "organizer",
    });
    assert.equal(classifyConversationPartition(row), "general");
    assert.equal(isMotiionBrandedThread(row), true);
    assert.equal(isOneWayMotiionThread(row), true);
    assert.equal(inboxDisplayName(row), "Motiion");
    assert.equal(isGroupThread(row), false);
  });

  it("puts platform announcements in Primary", () => {
    const row = conversation({
      conversation_id: "6",
      context_type: "platform_announcement",
      participant_user_id: null,
      participant_name: "Motiion",
      participant_role: null,
    });
    assert.equal(classifyConversationPartition(row), "primary");
    assert.equal(isOneWayMotiionThread(row), true);
    assert.equal(inboxDisplayName(row), "Motiion");
  });

  it("hides threads with no human message and counts badges like the app", () => {
    const visible = conversation({ conversation_id: "7", unread_count: 2, participant_role: "dancer" });
    const empty = conversation({
      conversation_id: "8",
      last_message_sender_id: null,
      unread_count: 9,
      participant_role: "choreographer",
    });
    assert.deepEqual(
      conversationsWithInboxActivity([visible, empty]).map((row) => row.conversation_id),
      ["7"],
    );
    assert.equal(partitionUnreadCount([visible, empty], "general"), 2);
    assert.equal(partitionUnreadCount([visible, empty], "primary"), 0);
    assert.equal(requestsChipCount(3, 1), 4);
    assert.equal(inboxNavBadgeCount([visible, empty], 1, 3), 6);
  });
});

describe("inbox timestamps", () => {
  const now = new Date(2026, 8, 27, 15, 30);

  it("uses a clock time for today", () => {
    const label = formatInboxTimestamp(new Date(2026, 8, 27, 9, 5).toISOString(), now);
    assert.match(label, /9:05/);
  });

  it("uses Yesterday, a weekday, then a short date", () => {
    const friday = new Date(2026, 8, 25, 11, 0);
    const older = new Date(2026, 7, 1, 11, 0);
    assert.equal(formatInboxTimestamp(new Date(2026, 8, 26, 11, 0).toISOString(), now), "Yesterday");
    assert.equal(
      formatInboxTimestamp(friday.toISOString(), now),
      friday.toLocaleDateString(undefined, { weekday: "short" }),
    );
    assert.equal(
      formatInboxTimestamp(older.toISOString(), now),
      older.toLocaleDateString(undefined, { month: "numeric", day: "numeric", year: "2-digit" }),
    );
  });
});
