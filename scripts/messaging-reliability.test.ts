import assert from "node:assert/strict";
import { test } from "node:test";
import { conversationDraftKey, friendlyRequestSchedule, mergeConversationMessages } from "../src/lib/messaging/reliability";
import type { ConversationMessage } from "../src/lib/app/conversations";

const message = (id: string, created_at: string): ConversationMessage => ({ id, created_at, conversation_id: "c", sender_id: "u", sender_name: "User", sender_avatar_url: null, body: id, message_type: "text", deleted_at: null });

test("refresh preserves unconfirmed and failed sends, deduplicates and sorts incoming messages", () => {
  const early = message("server", "2026-11-01T10:00:00Z");
  const pending = message("pending", "2026-11-01T11:00:00Z");
  const incoming = message("new", "2026-11-01T10:30:00Z");
  const result = mergeConversationMessages([early, pending], [incoming, early, early], new Set([pending.id]));
  assert.deepEqual(result.map((row) => row.id), ["server", "new", "pending"]);
  assert.deepEqual(mergeConversationMessages(result, [early, incoming], new Set()).map((row) => row.id), ["server", "new"]);
});

test("message drafts are isolated for accounts that share the same conversation", () => {
  assert.notEqual(conversationDraftKey("account-a", "shared"), conversationDraftKey("account-b", "shared"));
  assert.notEqual(conversationDraftKey("account-a", "one"), conversationDraftKey("account-a", "two"));
});

test("request schedule copy matches current iOS midnight, noon, minutes and date-only behavior", () => {
  assert.equal(friendlyRequestSchedule("2026-09-08 · 17:00"), "Sep 8 at 5pm");
  assert.equal(friendlyRequestSchedule("2026-09-08 · 17:30"), "Sep 8 at 5:30pm");
  assert.equal(friendlyRequestSchedule("2026-09-08 · 00:00"), "Sep 8 at 12am");
  assert.equal(friendlyRequestSchedule("2026-09-08 · 12:00"), "Sep 8 at 12pm");
  assert.equal(friendlyRequestSchedule("2026-09-08"), "Sep 8");
  assert.equal(friendlyRequestSchedule("Los Angeles"), null);
});
