const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function dealMemoHref(memoId: string, role: "talent" | "industry") {
  return role === "industry" ? `/bookings/deal-memos/${memoId}` : `/deal-memos/${memoId}`;
}

export function dealMemoNotificationHref(row: { type: string; data?: unknown }) {
  if (row.type !== "booking_deal_memo" || !row.data || typeof row.data !== "object") return null;
  const data = row.data as Record<string, unknown>;
  const memoId = typeof data.memo_id === "string" ? data.memo_id : "";
  if (!UUID.test(memoId)) return null;
  if (data.recipient_role !== "talent" && data.recipient_role !== "industry") return null;
  return dealMemoHref(memoId, data.recipient_role);
}
