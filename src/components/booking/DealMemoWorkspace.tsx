"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  BOOKING_NOTE_MAX,
  DECLINE_REASONS,
  type DeclineReason,
  type FieldError,
  formatCents,
  getModuleSpec,
  type IndustryReply,
  type ModuleSpec,
  type ModuleValue,
  normalizeModuleValue,
  type ProvisionRecord,
  SECTIONS,
  type TalentFlag,
} from "@/lib/booking/deal-memo";
import {
  acceptDealMemo,
  type BookingActionResult,
  declineDealMemo,
  flagDealMemo,
  replyToDealMemo,
  requestDealMemoCall,
  startBookingCheckout,
  syncBookingCheckout,
} from "@/lib/booking/deal-memo-actions";
import type { BookingCheckoutInfo, DealMemoContext, DealMemoPayload, PayoutStatus } from "@/lib/booking/deal-memo-types";
import { ModuleDiff, ModuleFieldsEditor, ModuleValueSummary } from "./ModuleFields";
import { DealMemoChip, DealMemoThread, FeePreview } from "./DealMemoParts";
import { BookingPaymentElement } from "./BookingPaymentElement";
import { PayoutSetupCard } from "./PayoutSetupCard";

type FlagDraft = { flag: Exclude<TalentFlag, "accept">; proposedValue: ModuleValue; note: string };
type ReplyDraft = { reply: IndustryReply; counterValue: ModuleValue; declineReason: DeclineReason | ""; note: string };

const DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

function anchor(code: string) {
  return `module-${code}`;
}

function flagOptions(spec: ModuleSpec, provision: ProvisionRecord): { value: FlagDraft["flag"]; label: string }[] {
  if (spec.placeholder) return [];
  const options: { value: FlagDraft["flag"]; label: string }[] = [];
  if (provision.included && spec.fields.length) options.push({ value: "dispute", label: "Propose different terms" });
  if (provision.included && spec.removable) options.push({ value: "remove", label: "Ask to remove" });
  if (!provision.included && spec.talentAddable) options.push({ value: "add", label: "Ask to add" });
  return options;
}

function replyLabel(provision: ProvisionRecord) {
  switch (provision.industry_reply) {
    case "accept_change":
      return { label: "Change accepted", tone: "success" };
    case "counter":
      return { label: "Countered", tone: "accent" };
    case "decline": {
      const reason = DECLINE_REASONS.find((r) => r.value === provision.industry_decline_reason)?.label;
      return { label: `Declined${reason ? `: ${reason}` : ""}`, tone: "danger" };
    }
    default:
      return null;
  }
}

export function DealMemoWorkspace({
  initial,
  context,
  payout,
  messagesHref,
  newOfferHref,
}: {
  initial: DealMemoPayload;
  context: DealMemoContext;
  payout?: PayoutStatus | null;
  messagesHref: string;
  newOfferHref?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [payload, setPayload] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<{ message: string; code: string | null; fields: FieldError[] } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [flags, setFlags] = useState<Record<string, FlagDraft>>({});
  const [openRequest, setOpenRequest] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, ReplyDraft>>({});
  const [signature, setSignature] = useState("");
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState<DeclineReason | "">("");
  const [declineNote, setDeclineNote] = useState("");
  const [checkout, setCheckout] = useState<BookingCheckoutInfo | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const { memo, provisions, viewer } = payload;
  const expired = payload.expired;
  const talentTurn = viewer === "talent" && ["offered", "negotiating"].includes(memo.status) && memo.awaiting_party === "talent";
  const industryTurn = viewer === "industry" && memo.status === "negotiating" && memo.awaiting_party === "industry";
  const readyForPayment = memo.status === "payment_pending" && !expired;
  const open = ["offered", "negotiating", "payment_pending"].includes(memo.status) && !expired;
  const pendingFlags = Object.keys(flags).length;
  const paying = memo.payment_state === "processing";

  const handle = useCallback(
    (result: BookingActionResult<DealMemoPayload>, success?: string) => {
      if (!result.ok) {
        setError({ message: result.error, code: result.errorCode, fields: result.fieldErrors });
        requestAnimationFrame(() => errorRef.current?.focus());
        return false;
      }
      setError(null);
      setPayload(result.data);
      if (result.data.checkout) setCheckout(result.data.checkout);
      if (success) setNotice(success);
      router.refresh();
      return true;
    },
    [router],
  );

  const run = (action: () => Promise<BookingActionResult<DealMemoPayload>>, success?: string, after?: () => void) => {
    setNotice(null);
    startTransition(async () => {
      if (handle(await action(), success)) after?.();
    });
  };

  const sync = useCallback(async (attempts = 1) => {
    for (let i = 0; i < attempts; i += 1) {
      const result = await syncBookingCheckout(memo.id);
      if (result.ok) {
        setPayload(result.data);
        if (result.data.memo.status === "paid") {
          setCheckout(null);
          router.refresh();
          return;
        }
      }
      if (i < attempts - 1) await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    router.refresh();
  }, [memo.id, router]);

  useEffect(() => {
    if (!paying) return;
    const timer = window.setInterval(() => void sync(1), 5000);
    return () => window.clearInterval(timer);
  }, [paying, sync]);

  const fieldErrors = (code: string) => error?.fields.filter((f) => f.moduleCode === code) ?? [];

  const renderTalentRequest = (spec: ModuleSpec, provision: ProvisionRecord) => {
    const options = flagOptions(spec, provision);
    if (!options.length) return null;
    const draft = flags[spec.code];
    const expanded = openRequest === spec.code || Boolean(draft);
    const setDraft = (next: FlagDraft | null) =>
      setFlags((current) => {
        const copy = { ...current };
        if (next) copy[spec.code] = next;
        else delete copy[spec.code];
        return copy;
      });
    const start = (flag: FlagDraft["flag"]) =>
      setDraft({
        flag,
        note: draft?.note ?? "",
        proposedValue: flag === "add" ? normalizeModuleValue(spec, spec.defaults).value : { ...provision.value },
      });
    if (!expanded) {
      return (
        <div>
          <button
            type="button"
            className="deal-memo__btn"
            data-variant="secondary"
            data-size="small"
            aria-expanded="false"
            aria-controls={`${anchor(spec.code)}-request`}
            onClick={() => {
              setOpenRequest(spec.code);
              start(options[0].value);
            }}
          >
            {options[0].value === "add" ? "Ask to add" : "Request a change"}
          </button>
        </div>
      );
    }
    return (
      <div id={`${anchor(spec.code)}-request`} className="deal-memo__request">
        {options.length > 1 ? (
          <fieldset>
            <legend className="deal-memo__sub">What would you like to change?</legend>
            <div className="deal-memo__options">
              {options.map((option) => (
                <label key={option.value} className="deal-memo__check">
                  <input type="radio" name={`${spec.code}-flag`} checked={draft?.flag === option.value} onChange={() => start(option.value)} />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
        ) : (
          <p className="deal-memo__sub">{options[0].label}</p>
        )}
        {draft && draft.flag !== "remove" ? (
          <ModuleFieldsEditor
            spec={spec}
            value={draft.proposedValue}
            errors={fieldErrors(spec.code)}
            onChange={(proposedValue) => setDraft({ ...draft, proposedValue })}
          />
        ) : null}
        {draft ? (
          <label className="deal-memo__field">
            <span>Note to Industry (optional)</span>
            <textarea value={draft.note} maxLength={BOOKING_NOTE_MAX} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
          </label>
        ) : null}
        <div>
          <button
            type="button"
            className="deal-memo__btn"
            data-variant="ghost"
            data-size="small"
            onClick={() => {
              setDraft(null);
              setOpenRequest(null);
            }}
          >
            Keep as offered
          </button>
        </div>
      </div>
    );
  };

  const renderIndustryReply = (spec: ModuleSpec, provision: ProvisionRecord) => {
    const draft = replies[spec.code];
    const setDraft = (patch: Partial<ReplyDraft>) =>
      setReplies((current) => {
        const base: ReplyDraft = current[spec.code] ?? {
          reply: "accept_change",
          counterValue: { ...(provision.talent_proposed_value ?? provision.value) },
          declineReason: "",
          note: "",
        };
        return { ...current, [spec.code]: { ...base, ...patch } };
      });
    const choices: { value: IndustryReply; label: string }[] = [
      { value: "accept_change", label: "Accept change" },
      ...(provision.talent_flag === "remove" ? [] : [{ value: "counter" as const, label: "Counter" }]),
      { value: "decline", label: "Decline" },
    ];
    return (
      <fieldset className="deal-memo__request">
        <legend className="deal-memo__sub">Your response</legend>
        <div className="deal-memo__options">
          {choices.map((choice) => (
            <label key={choice.value} className="deal-memo__check">
              <input type="radio" name={`${spec.code}-reply`} checked={draft?.reply === choice.value} onChange={() => setDraft({ reply: choice.value })} />
              {choice.label}
            </label>
          ))}
        </div>
        {draft?.reply === "counter" ? (
          <ModuleFieldsEditor spec={spec} value={draft.counterValue} errors={fieldErrors(spec.code)} onChange={(counterValue) => setDraft({ counterValue })} />
        ) : null}
        {draft?.reply === "decline" ? (
          <label className="deal-memo__field">
            <span>Reason</span>
            <select value={draft.declineReason} onChange={(e) => setDraft({ declineReason: e.target.value as DeclineReason })}>
              <option value="">Choose a reason</option>
              {DECLINE_REASONS.map((reason) => (
                <option key={reason.value} value={reason.value}>
                  {reason.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {draft ? (
          <label className="deal-memo__field">
            <span>Note to talent{draft.reply === "decline" && draft.declineReason === "other" ? " (required)" : " (optional)"}</span>
            <textarea value={draft.note} maxLength={BOOKING_NOTE_MAX} onChange={(e) => setDraft({ note: e.target.value })} />
          </label>
        ) : null}
      </fieldset>
    );
  };

  const renderModule = (provision: ProvisionRecord) => {
    const spec = getModuleSpec(provision.module_code);
    if (!spec) return null;
    const reply = provision.state === "pending" ? replyLabel(provision) : null;
    const requested = provision.state === "change_requested";
    const errors = fieldErrors(spec.code);
    const showDiff = provision.previous_value != null || provision.previous_included != null;
    return (
      <article
        key={spec.code}
        id={anchor(spec.code)}
        className="deal-memo__module"
        data-excluded={!provision.included}
        data-state={provision.state}
        data-invalid={errors.length > 0}
        aria-labelledby={`${anchor(spec.code)}-title`}
      >
        <div className="deal-memo__module-head">
          <h3 id={`${anchor(spec.code)}-title`}>{spec.label}</h3>
          <div className="deal-memo__badges">
            {spec.required ? <span className="deal-memo__badge" data-tone="accent">Required</span> : null}
            {spec.placeholder ? <span className="deal-memo__badge" data-tone="attention">Placeholder · counsel review</span> : null}
            {!provision.included ? <span className="deal-memo__badge">Not included</span> : null}
            {requested ? <span className="deal-memo__badge" data-tone="attention">Change requested</span> : null}
            {reply ? <span className="deal-memo__badge" data-tone={reply.tone}>{reply.label}</span> : null}
            {flags[spec.code] ? <span className="deal-memo__badge" data-tone="attention">Your request (not sent)</span> : null}
          </div>
        </div>
        {provision.included ? (
          <ModuleValueSummary spec={spec} value={provision.value} />
        ) : (
          <p className="deal-memo__sub">{spec.description} Not included in this offer.</p>
        )}
        {showDiff ? (
          <ModuleDiff
            spec={spec}
            before={provision.previous_value}
            after={provision.value}
            beforeIncluded={provision.previous_included}
            afterIncluded={provision.included}
            label={viewer === "talent" ? "Updated by Industry" : "Your update"}
          />
        ) : null}
        {provision.industry_note && provision.state === "pending" ? (
          <p className="deal-memo__note">
            <strong>{viewer === "industry" ? "Your note" : "Industry"}:</strong> {provision.industry_note}
          </p>
        ) : null}
        {requested ? (
          <div className="deal-memo__stack" style={{ gap: 8 }}>
            {provision.talent_flag === "remove" ? (
              <p className="deal-memo__note" data-tone="attention">
                {viewer === "industry" ? context.counterpartName : "You"} asked to remove this clause.
              </p>
            ) : provision.talent_flag === "add" ? (
              <>
                <p className="deal-memo__note" data-tone="attention">
                  {viewer === "industry" ? context.counterpartName : "You"} asked to add this clause.
                </p>
                <ModuleValueSummary spec={spec} value={provision.talent_proposed_value} />
              </>
            ) : (
              <ModuleDiff spec={spec} before={provision.value} after={provision.talent_proposed_value} label={viewer === "industry" ? "Talent proposes" : "You proposed"} />
            )}
            {provision.talent_note ? (
              <p className="deal-memo__note">
                <strong>{viewer === "industry" ? context.counterpartName : "Your note"}:</strong> {provision.talent_note}
              </p>
            ) : null}
          </div>
        ) : null}
        {talentTurn ? renderTalentRequest(spec, provision) : null}
        {industryTurn && requested ? renderIndustryReply(spec, provision) : null}
        {errors.filter((e) => !e.field).map((e, index) => (
          <p key={index} className="deal-memo__field-error">
            {e.message}
          </p>
        ))}
      </article>
    );
  };

  const submitFlags = () =>
    run(
      () =>
        flagDealMemo({
          memoId: memo.id,
          expectedVersion: memo.version,
          flags: Object.entries(flags).map(([moduleCode, draft]) => ({
            moduleCode,
            flag: draft.flag,
            proposedValue: draft.flag === "remove" ? undefined : draft.proposedValue,
            note: draft.note,
          })),
        }),
      "Changes sent to Industry.",
      () => {
        setFlags({});
        setOpenRequest(null);
      },
    );

  const submitReplies = () =>
    run(
      () =>
        replyToDealMemo({
          memoId: memo.id,
          expectedVersion: memo.version,
          replies: provisions
            .filter((p) => p.state === "change_requested" && replies[p.module_code])
            .map((p) => {
              const draft = replies[p.module_code];
              return {
                moduleCode: p.module_code,
                reply: draft.reply,
                counterValue: draft.reply === "counter" ? draft.counterValue : undefined,
                declineReason: draft.reply === "decline" && draft.declineReason ? draft.declineReason : null,
                note: draft.note,
              };
            }),
        }),
      "Response sent to talent.",
      () => setReplies({}),
    );

  const pay = (mode: "payment_intent" | "checkout") =>
    startTransition(async () => {
      setNotice(null);
      const result = await startBookingCheckout({
        memoId: memo.id,
        expectedVersion: memo.version,
        signatureName: memo.industry_signed_at ? undefined : signature,
        mode,
      });
      if (!handle(result)) return;
      const info = result.ok ? result.data.checkout : undefined;
      if (info?.mode === "checkout" && info.url) window.location.assign(info.url);
    });

  const returnUrl = typeof window === "undefined" ? "" : `${window.location.origin}${pathname}`;
  const openReplyCount = provisions.filter((p) => p.state === "change_requested").length;
  const answered = provisions.filter((p) => p.state === "change_requested" && replies[p.module_code]).length;

  const actionPanel = () => {
    if (memo.status === "paid") {
      return (
        <section className="deal-memo__booked" aria-labelledby="deal-memo-booked-heading" role="status">
          <p className="deal-memo__eyebrow" style={{ color: "inherit" }}>Paid / Booked</p>
          <strong id="deal-memo-booked-heading">You&apos;re booked</strong>
          <p>
            {viewer === "industry"
              ? `Paid ${formatCents(memo.charge_amount_cents)}${memo.paid_at ? ` on ${DATE.format(new Date(memo.paid_at))}` : ""}. ${context.counterpartName} receives ${formatCents(memo.talent_deal_cents)}.`
              : `${formatCents(memo.talent_deal_cents)} is on its way to your payout account.`}
          </p>
          {memo.payment_state === "refunded" || memo.payment_state === "partially_refunded" ? (
            <p>Refunded {formatCents(memo.amount_refunded_cents)}.</p>
          ) : null}
          {memo.payment_state === "disputed" ? <p>This payment is under review.</p> : null}
        </section>
      );
    }
    if (expired || ["declined", "cancelled", "expired"].includes(memo.status)) {
      const copy = expired
        ? "Ready for payment expired before payment."
        : memo.status === "declined"
        ? `Declined${memo.decline_reason ? ` · ${DECLINE_REASONS.find((r) => r.value === memo.decline_reason)?.label}` : ""}${memo.decline_note ? ` — “${memo.decline_note}”` : ""}`
        : memo.paid_at
        ? "Canceled after payment. Refund details are in the thread."
        : "This deal memo was canceled.";
      return (
        <section className="deal-memo__panel deal-memo__stack" aria-label="Deal memo closed" style={{ gap: 12 }}>
          <p className="deal-memo__note">{copy}</p>
          {viewer === "industry" && newOfferHref ? (
            <Link className="deal-memo__btn" href={newOfferHref}>
              Send a new offer
            </Link>
          ) : null}
        </section>
      );
    }
    if (viewer === "talent") {
      if (talentTurn) {
        return (
          <section className="deal-memo__panel deal-memo__stack" aria-labelledby="deal-memo-talent-actions" style={{ gap: 14 }}>
            <h2 id="deal-memo-talent-actions" style={{ margin: 0 }}>Your response</h2>
            {pendingFlags ? (
              <>
                <p className="deal-memo__sub">
                  {pendingFlags} requested change{pendingFlags === 1 ? "" : "s"}. Everything else is accepted as offered.
                </p>
                <button type="button" className="deal-memo__btn" disabled={pending} onClick={submitFlags}>
                  Send requested changes
                </button>
              </>
            ) : (
              <>
                <label className="deal-memo__field" htmlFor="deal-memo-talent-signature">
                  <span>Type your full legal name to sign</span>
                  <input id="deal-memo-talent-signature" type="text" autoComplete="name" value={signature} maxLength={120} onChange={(e) => setSignature(e.target.value)} />
                </label>
                <button type="button" className="deal-memo__btn" disabled={pending || signature.trim().length < 2} onClick={() => run(() => acceptDealMemo({ memoId: memo.id, expectedVersion: memo.version, signatureName: signature }), "Accepted. Industry can pay to book.")}>
                  Accept deal
                </button>
                <p className="deal-memo__sub">Or use “Request a change” on any module to negotiate.</p>
              </>
            )}
            <div className="deal-memo__actions">
              <button type="button" className="deal-memo__btn" data-variant="secondary" disabled={pending} onClick={() => run(() => requestDealMemoCall({ memoId: memo.id, expectedVersion: memo.version }), "Call requested. Industry has been notified.")}>
                Schedule a call
              </button>
              <Link className="deal-memo__btn" data-variant="ghost" href={messagesHref}>
                Message
              </Link>
            </div>
            {declinePanel()}
          </section>
        );
      }
      return (
        <section className="deal-memo__panel deal-memo__stack" aria-label="Status" style={{ gap: 12 }}>
          {readyForPayment ? (
            <p className="deal-memo__note" data-tone="success">
              You accepted and signed. Waiting on Industry to pay{memo.expires_at ? ` by ${DATE.format(new Date(memo.expires_at))}` : ""}.
            </p>
          ) : (
            <p className="deal-memo__note">Waiting on Industry to respond to your changes.</p>
          )}
          <div className="deal-memo__actions">
            <Link className="deal-memo__btn" data-variant="secondary" href={messagesHref}>
              Message
            </Link>
          </div>
          {!paying ? declinePanel() : null}
        </section>
      );
    }

    if (industryTurn) {
      return (
        <section className="deal-memo__panel deal-memo__stack" aria-labelledby="deal-memo-industry-actions" style={{ gap: 12 }}>
          <h2 id="deal-memo-industry-actions" style={{ margin: 0 }}>Changes requested</h2>
          <p className="deal-memo__sub">
            Respond to each change ({answered}/{openReplyCount}). The memo goes back to {context.counterpartName} to accept.
          </p>
          <button type="button" className="deal-memo__btn" disabled={pending || answered < openReplyCount} onClick={submitReplies}>
            Send response
          </button>
          <Link className="deal-memo__btn" data-variant="ghost" href={messagesHref}>
            Message talent
          </Link>
          {declinePanel()}
        </section>
      );
    }
    if (readyForPayment) {
      return (
        <section className="deal-memo__panel deal-memo__stack" aria-labelledby="deal-memo-pay-heading" style={{ gap: 12 }}>
          <h2 id="deal-memo-pay-heading" style={{ margin: 0 }}>Pay and book</h2>
          <p className="deal-memo__sub">
            {context.counterpartName} accepted and signed{memo.talent_signed_name ? ` as “${memo.talent_signed_name}”` : ""}.
            {memo.expires_at ? ` Ready for payment until ${DATE.format(new Date(memo.expires_at))}.` : ""}
          </p>
          {!payload.payoutReady ? (
            <p className="deal-memo__note" data-tone="attention" role="status">
              Waiting on {context.counterpartName} to finish payout setup. Pay unlocks as soon as they do. We&apos;ve let
              them know.
            </p>
          ) : paying ? (
            <p className="deal-memo__note" role="status">Payment is processing. This page updates when it completes.</p>
          ) : checkout?.clientSecret ? (
            <BookingPaymentElement
              clientSecret={checkout.clientSecret}
              amountCents={memo.charge_amount_cents}
              returnUrl={returnUrl}
              theme="light"
              onPaid={() => void sync(5)}
            />
          ) : (
            <>
              {!memo.industry_signed_at ? (
                <label className="deal-memo__field" htmlFor="deal-memo-industry-signature">
                  <span>Type your full legal name to sign</span>
                  <input id="deal-memo-industry-signature" type="text" autoComplete="name" value={signature} maxLength={120} onChange={(e) => setSignature(e.target.value)} />
                </label>
              ) : (
                <p className="deal-memo__sub">Signed as “{memo.industry_signed_name}”.</p>
              )}
              <button type="button" className="deal-memo__btn" disabled={pending || (!memo.industry_signed_at && signature.trim().length < 2)} onClick={() => pay("payment_intent")}>
                Continue to payment · {formatCents(memo.charge_amount_cents)}
              </button>
              <button type="button" className="deal-memo__btn" data-variant="ghost" disabled={pending || (!memo.industry_signed_at && signature.trim().length < 2)} onClick={() => pay("checkout")}>
                Pay on Stripe Checkout instead
              </button>
            </>
          )}
          {!paying ? declinePanel() : null}
        </section>
      );
    }
    return (
      <section className="deal-memo__panel deal-memo__stack" aria-label="Status" style={{ gap: 12 }}>
        <p className="deal-memo__note">Waiting on {context.counterpartName} to review.</p>
        <Link className="deal-memo__btn" data-variant="secondary" href={messagesHref}>
          Message talent
        </Link>
        {declinePanel()}
      </section>
    );
  };

  function declinePanel() {
    if (!open) return null;
    const isTalent = viewer === "talent";
    const noteRequired = declineReason === "other";
    return (
      <details open={declineOpen} onToggle={(e) => setDeclineOpen((e.target as HTMLDetailsElement).open)}>
        <summary>{isTalent ? "Decline deal" : "Cancel offer"}</summary>
        <div className="deal-memo__stack" style={{ gap: 10, marginTop: 8 }}>
          <label className="deal-memo__field">
            <span>Reason{isTalent ? "" : " (optional)"}</span>
            <select value={declineReason} onChange={(e) => setDeclineReason(e.target.value as DeclineReason)}>
              <option value="">Choose a reason</option>
              {DECLINE_REASONS.map((reason) => (
                <option key={reason.value} value={reason.value}>
                  {reason.label}
                </option>
              ))}
            </select>
          </label>
          <label className="deal-memo__field">
            <span>Note{noteRequired ? " (required)" : " (optional)"}</span>
            <textarea value={declineNote} maxLength={BOOKING_NOTE_MAX} onChange={(e) => setDeclineNote(e.target.value)} />
          </label>
          <button
            type="button"
            className="deal-memo__btn"
            data-variant="danger"
            disabled={pending || (isTalent && !declineReason) || (noteRequired && !declineNote.trim())}
            onClick={() =>
              run(
                () => declineDealMemo({ memoId: memo.id, expectedVersion: memo.version, reason: declineReason || null, note: declineNote }),
                isTalent ? "Declined." : "Offer canceled.",
              )}
          >
            {isTalent ? "Decline deal" : "Cancel offer"}
          </button>
        </div>
      </details>
    );
  }

  return (
    <div className="deal-memo" data-theme="light">
      <div className="deal-memo__inner">
        <header className="deal-memo__header">
          <div>
            <p className="deal-memo__eyebrow">Tour / live dancer deal memo{memo.negotiation_round ? ` · Round ${memo.negotiation_round}` : ""}</p>
            <h1>{viewer === "industry" ? `Booking ${context.counterpartName}` : `Offer from ${context.counterpartName}`}</h1>
            <p className="deal-memo__sub">
              {[context.availabilityTitle, context.projectTitle].filter(Boolean).join(" · ") || "Confirmed availability"}
            </p>
          </div>
          <DealMemoChip chip={payload.chip} />
        </header>

        <div aria-live="polite" className="deal-memo__sr-only">
          {notice}
        </div>
        {notice ? (
          <p className="deal-memo__note" data-tone="success" style={{ marginBottom: 16 }}>
            {notice}
          </p>
        ) : null}
        {error ? (
          <div ref={errorRef} tabIndex={-1} className="deal-memo__errors" role="alert" style={{ marginBottom: 16 }}>
            <strong>{error.message}</strong>
            {error.fields.length ? (
              <ul>
                {error.fields.map((field, index) => (
                  <li key={index}>{field.moduleCode ? <a href={`#${anchor(field.moduleCode)}`}>{field.message}</a> : field.message}</li>
                ))}
              </ul>
            ) : null}
            {error.code === "MEMO_CONFLICT" ? (
              <div style={{ marginTop: 8 }}>
                <button type="button" className="deal-memo__btn" data-variant="secondary" data-size="small" onClick={() => router.refresh()}>
                  Load latest version
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="deal-memo__grid">
          <div className="deal-memo__stack">
            {memo.cover_note ? (
              <section className="deal-memo__panel" aria-labelledby="deal-memo-cover-heading">
                <h2 id="deal-memo-cover-heading">{viewer === "industry" ? "Your note" : `Note from ${context.counterpartName}`}</h2>
                <p>{memo.cover_note}</p>
              </section>
            ) : null}
            {SECTIONS.map((section) => {
              const rows = provisions.filter((p) => p.section === section.code);
              if (!rows.length) return null;
              return (
                <section key={section.code} className="deal-memo__section" aria-labelledby={`section-${section.code}`}>
                  <div className="deal-memo__section-title">
                    <h2 id={`section-${section.code}`}>{section.label}</h2>
                  </div>
                  {rows.map(renderModule)}
                </section>
              );
            })}
            <section className="deal-memo__panel" aria-labelledby="deal-memo-signatures">
              <h2 id="deal-memo-signatures">Signatures</h2>
              <dl className="deal-memo__summary">
                <div>
                  <dt>Talent</dt>
                  <dd>{memo.talent_signed_name ? `${memo.talent_signed_name}${memo.talent_signed_at ? ` · ${DATE.format(new Date(memo.talent_signed_at))}` : ""}` : "Not signed yet"}</dd>
                </div>
                <div>
                  <dt>Industry</dt>
                  <dd>{memo.industry_signed_name ? `${memo.industry_signed_name}${memo.industry_signed_at ? ` · ${DATE.format(new Date(memo.industry_signed_at))}` : ""}` : "Signs at payment"}</dd>
                </div>
                <div>
                  <dt>Terms</dt>
                  <dd>Exhibit A {memo.exhibit_a_version} · EOR {memo.eor_version} (placeholders)</dd>
                </div>
              </dl>
            </section>
          </div>

          <aside className="deal-memo__aside" aria-label="Deal actions">
            {actionPanel()}
            <FeePreview
              viewer={viewer}
              lines={payload.dealLines}
              talentDealCents={memo.talent_deal_cents}
              platformFeeBps={memo.platform_fee_bps}
              platformFeeCents={memo.platform_fee_cents}
              chargeAmountCents={memo.charge_amount_cents}
              agencyClause={memo.agency_clause_enabled}
            />
            {viewer === "talent" && memo.status !== "paid" && open && !payload.payoutReady ? (
              <PayoutSetupCard payout={payout ?? null} returnPath={pathname} />
            ) : null}
            <DealMemoThread events={payload.events} viewer={viewer} counterpartName={context.counterpartName} />
          </aside>
        </div>
      </div>
    </div>
  );
}
