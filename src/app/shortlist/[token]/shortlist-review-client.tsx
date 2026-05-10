"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";

type SharePayload = {
  share: {
    id: string;
    title: string;
    message: string | null;
    roleTitle: string;
    projectTitle: string;
  };
  recipients: { id: string; displayName: string }[];
  submissions: ShortlistSubmission[];
};

type ShortlistSubmission = {
  id: string;
  displayName: string;
  headshotUrl: string | null;
  representation: string | null;
  gender: string | null;
  location: string | null;
  bio: string | null;
  skills: string[];
};

type VoteValue = "yes" | "no";

export default function ShortlistReviewClient({ token: rawToken }: { token: string }) {
  const token = decodeURIComponent(rawToken).trim();
  const [payload, setPayload] = useState<SharePayload | null>(null);
  const [selectedRecipientId, setSelectedRecipientId] = useState("");
  const [votes, setVotes] = useState<Record<string, VoteValue>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [didSubmit, setDidSubmit] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await callShortlistFunction<SharePayload>({ token });
        if (cancelled) return;
        setPayload(data);
        setSelectedRecipientId(data.recipients[0]?.id ?? "");
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load shortlist.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const completedCount = useMemo(() => Object.keys(votes).length, [votes]);
  const canSubmit = Boolean(selectedRecipientId) && completedCount > 0 && !isSubmitting;

  async function submitVotes() {
    if (!payload || !canSubmit) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await callShortlistFunction({
        action: "submit",
        token,
        recipientId: selectedRecipientId,
        votes: Object.entries(votes).map(([submissionId, vote]) => ({ submissionId, vote })),
      });
      setDidSubmit(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit votes.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <Shell>
        <StatusText>Loading shortlist...</StatusText>
      </Shell>
    );
  }

  if (error && !payload) {
    return (
      <Shell>
        <StatusText>{error}</StatusText>
      </Shell>
    );
  }

  if (!payload) {
    return (
      <Shell>
        <StatusText>Shortlist not found.</StatusText>
      </Shell>
    );
  }

  if (didSubmit) {
    return (
      <Shell>
        <section style={cardStyle}>
          <p style={eyebrowStyle}>{payload.share.projectTitle}</p>
          <h1 style={titleStyle}>Thanks for reviewing</h1>
          <p style={bodyTextStyle}>
            Your responses for {payload.share.roleTitle} were sent to the choreographer.
          </p>
        </section>
      </Shell>
    );
  }

  return (
    <Shell>
      <header style={{ display: "grid", gap: 8 }}>
        <p style={eyebrowStyle}>{payload.share.projectTitle}</p>
        <h1 style={titleStyle}>{payload.share.roleTitle}</h1>
        <p style={bodyTextStyle}>
          Review each profile and choose Confirm or Reject. Your responses go back to the choreographer.
        </p>
      </header>

      <section style={cardStyle}>
        <label style={{ display: "grid", gap: 8, fontSize: 13, fontWeight: 700 }}>
          Reviewing as
          <select
            value={selectedRecipientId}
            onChange={(event) => setSelectedRecipientId(event.target.value)}
            style={selectStyle}
          >
            {payload.recipients.map((recipient) => (
              <option key={recipient.id} value={recipient.id}>
                {recipient.displayName}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section style={{ display: "grid", gap: 14 }}>
        {payload.submissions.map((submission) => (
          <article key={submission.id} style={profileCardStyle}>
            <div style={{ display: "flex", gap: 14 }}>
              <Avatar submission={submission} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>{submission.displayName}</h2>
                <p style={{ ...bodyTextStyle, margin: "4px 0 0" }}>
                  {submission.representation || "Not represented"}
                </p>
                {submission.bio ? (
                  <p style={{ ...bodyTextStyle, margin: "12px 0 0" }}>{submission.bio}</p>
                ) : null}
                {submission.skills.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                    {submission.skills.slice(0, 8).map((skill) => (
                      <span key={skill} style={pillStyle}>
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
              <VoteButton
                label="Confirm"
                selected={votes[submission.id] === "yes"}
                onClick={() => setVotes((current) => ({ ...current, [submission.id]: "yes" }))}
              />
              <VoteButton
                label="Reject"
                selected={votes[submission.id] === "no"}
                onClick={() => setVotes((current) => ({ ...current, [submission.id]: "no" }))}
              />
            </div>
          </article>
        ))}
      </section>

      {error ? <p style={{ ...bodyTextStyle, color: "#b91c1c" }}>{error}</p> : null}

      <button disabled={!canSubmit} onClick={submitVotes} style={submitStyle(canSubmit)}>
        {isSubmitting ? "Submitting..." : `Submit ${completedCount} response${completedCount === 1 ? "" : "s"}`}
      </button>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f6f7f7",
        color: "#111",
        padding: "28px 18px 40px",
        fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: 720, margin: "0 auto", display: "grid", gap: 18 }}>
        {children}
      </div>
    </main>
  );
}

function StatusText({ children }: { children: React.ReactNode }) {
  return <p style={{ ...bodyTextStyle, textAlign: "center", marginTop: 80 }}>{children}</p>;
}

function Avatar({ submission }: { submission: ShortlistSubmission }) {
  if (submission.headshotUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={submission.headshotUrl}
        alt=""
        style={{
          width: 72,
          height: 72,
          borderRadius: 24,
          objectFit: "cover",
          background: "#e5e7eb",
        }}
      />
    );
  }

  const initials =
    submission.displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?";

  return (
    <div
      style={{
        width: 72,
        height: 72,
        borderRadius: 24,
        background: "#e5e7eb",
        display: "grid",
        placeItems: "center",
        fontWeight: 800,
      }}
    >
      {initials}
    </div>
  );
}

function VoteButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: selected ? "1px solid #111" : "1px solid #d1d5db",
        background: selected ? "#111" : "#fff",
        color: selected ? "#fff" : "#111",
        borderRadius: 999,
        padding: "12px 14px",
        fontWeight: 750,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

async function callShortlistFunction<T = Record<string, unknown>>(
  body: Record<string, unknown>,
): Promise<T> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anon) {
    throw new Error("Shortlist review is not configured.");
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/shortlist-share-public`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anon,
      Authorization: `Bearer ${anon}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Request failed.");
  }
  return data as T;
}

const eyebrowStyle: CSSProperties = {
  margin: 0,
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: 0.8,
  textTransform: "uppercase",
  color: "#525252",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 32,
  lineHeight: 1.05,
  letterSpacing: -0.8,
};

const bodyTextStyle: CSSProperties = {
  margin: 0,
  color: "#525252",
  lineHeight: 1.5,
};

const cardStyle: CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 24,
  padding: 18,
  boxShadow: "0 16px 40px rgba(17, 17, 17, 0.06)",
};

const profileCardStyle: CSSProperties = {
  ...cardStyle,
  padding: 16,
};

const selectStyle: CSSProperties = {
  width: "100%",
  minHeight: 46,
  borderRadius: 14,
  border: "1px solid #d1d5db",
  padding: "0 12px",
  background: "#fff",
  color: "#111",
  font: "inherit",
};

const pillStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "#374151",
  background: "#f3f4f6",
  borderRadius: 999,
  padding: "6px 9px",
};

function submitStyle(enabled: boolean): CSSProperties {
  return {
    border: 0,
    borderRadius: 999,
    padding: "16px 18px",
    background: enabled ? "#111" : "#9ca3af",
    color: "#fff",
    fontWeight: 800,
    fontSize: 16,
    cursor: enabled ? "pointer" : "not-allowed",
    position: "sticky",
    bottom: 16,
    boxShadow: "0 16px 36px rgba(17, 17, 17, 0.18)",
  };
}
