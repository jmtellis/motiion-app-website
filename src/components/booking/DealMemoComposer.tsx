"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  BOOKING_NOTE_MAX,
  BOOKING_PLATFORM_FEE_BPS,
  computeBookingFees,
  computeTalentDeal,
  type FieldError,
  getModuleSpec,
  type ModuleSpec,
  type ProvisionRecord,
  SECTIONS,
  validateForSend,
} from "@/lib/booking/deal-memo";
import { saveDealMemo } from "@/lib/booking/deal-memo-actions";
import type { DealMemoContext } from "@/lib/booking/deal-memo-types";
import { ModuleFieldsEditor } from "./ModuleFields";
import { DealMemoChip, FeePreview } from "./DealMemoParts";

function moduleAnchor(code: string) {
  return `module-${code}`;
}

function badgesFor(spec: ModuleSpec) {
  const badges: { label: string; tone?: string }[] = [];
  if (spec.required) badges.push({ label: "Required", tone: "accent" });
  else if (spec.placeholder) badges.push({ label: "Placeholder · counsel review", tone: "attention" });
  else if (!spec.defaultIncluded) badges.push({ label: "Optional add-on" });
  else if (spec.removable) badges.push({ label: "Toggleable clause" });
  return badges;
}

export function DealMemoComposer({
  availabilityRequestId,
  memoId,
  version,
  initialProvisions,
  initialCoverNote,
  context,
}: {
  availabilityRequestId?: string;
  memoId?: string;
  version?: number;
  initialProvisions: ProvisionRecord[];
  initialCoverNote: string;
  context: DealMemoContext;
}) {
  const router = useRouter();
  const [provisions, setProvisions] = useState(initialProvisions);
  const [coverNote, setCoverNote] = useState(initialCoverNote);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [idempotencyKey] = useState(() => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-compose`));
  const errorRef = useRef<HTMLDivElement>(null);

  const deal = useMemo(() => computeTalentDeal(provisions), [provisions]);
  const fees = computeBookingFees(deal.talentDealCents, BOOKING_PLATFORM_FEE_BPS);
  const gate = useMemo(() => validateForSend(provisions), [provisions]);
  const agencyOn = provisions.some((p) => p.module_code === "agency_commission" && p.included);

  const update = (code: string, patch: Partial<ProvisionRecord>) =>
    setProvisions((current) => current.map((p) => (p.module_code === code ? { ...p, ...patch } : p)));

  const submit = (send: boolean) => {
    setMessage(null);
    setStatus(null);
    startTransition(async () => {
      const result = await saveDealMemo({
        ...(memoId ? { memoId, expectedVersion: version } : { availabilityRequestId, idempotencyKey }),
        coverNote,
        send,
        modules: provisions.map((p) => ({ moduleCode: p.module_code, included: p.included, value: p.value })),
      });
      if (!result.ok) {
        setErrors(result.fieldErrors);
        setMessage(result.error);
        if (result.errorCode === "MEMO_EXISTS" && result.memoId) {
          router.push(`/bookings/deal-memos/${result.memoId}`);
          return;
        }
        requestAnimationFrame(() => errorRef.current?.focus());
        return;
      }
      setErrors([]);
      if (send || !memoId) {
        router.push(`/bookings/deal-memos/${result.data.memo.id}`);
        router.refresh();
      } else {
        setStatus("Draft saved.");
        router.refresh();
      }
    });
  };

  const errorsByModule = new Map<string, FieldError[]>();
  for (const error of errors) {
    errorsByModule.set(error.moduleCode, [...(errorsByModule.get(error.moduleCode) ?? []), error]);
  }
  const remaining = gate.errors;

  return (
    <div className="deal-memo" data-theme="light">
      <div className="deal-memo__inner">
        <header className="deal-memo__header">
          <div>
            <p className="deal-memo__eyebrow">Tour / live dancer deal memo</p>
            <h1>Book {context.counterpartName}</h1>
            <p className="deal-memo__sub">
              {[context.availabilityTitle, context.projectTitle].filter(Boolean).join(" · ") || "Confirmed availability"}
            </p>
          </div>
          <DealMemoChip chip="Draft offer" />
        </header>

        <div className="deal-memo__grid">
          <form
            className="deal-memo__stack"
            aria-labelledby="deal-memo-compose-heading"
            onSubmit={(event) => {
              event.preventDefault();
              submit(true);
            }}
          >
            <h2 id="deal-memo-compose-heading" className="deal-memo__sr-only">
              Compose deal memo
            </h2>
            {message ? (
              <div ref={errorRef} tabIndex={-1} className="deal-memo__errors" role="alert">
                <strong>{message}</strong>
                {errors.length ? (
                  <ul>
                    {errors.map((error, index) => (
                      <li key={`${error.moduleCode}-${error.field ?? ""}-${index}`}>
                        {error.moduleCode ? <a href={`#${moduleAnchor(error.moduleCode)}`}>{error.message}</a> : error.message}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            <section className="deal-memo__panel" aria-labelledby="deal-memo-cover-heading">
              <h2 id="deal-memo-cover-heading">Message to talent</h2>
              <label className="deal-memo__field" htmlFor="deal-memo-cover">
                <span>Cover note (optional)</span>
                <textarea
                  id="deal-memo-cover"
                  value={coverNote}
                  maxLength={BOOKING_NOTE_MAX}
                  aria-describedby="deal-memo-cover-count"
                  onChange={(e) => setCoverNote(e.target.value)}
                />
                <span id="deal-memo-cover-count" className="deal-memo__sub">
                  {coverNote.length}/{BOOKING_NOTE_MAX}
                </span>
              </label>
            </section>

            {SECTIONS.map((section) => {
              const rows = provisions.filter((p) => p.section === section.code);
              if (!rows.length) return null;
              return (
                <section key={section.code} className="deal-memo__section" aria-labelledby={`section-${section.code}`}>
                  <div className="deal-memo__section-title">
                    <h2 id={`section-${section.code}`}>{section.label}</h2>
                  </div>
                  {rows.map((provision) => {
                    const spec = getModuleSpec(provision.module_code);
                    if (!spec) return null;
                    const toggleable = !spec.required && !spec.placeholder && (spec.removable || spec.talentAddable);
                    const moduleErrors = errorsByModule.get(spec.code) ?? [];
                    return (
                      <article
                        key={spec.code}
                        id={moduleAnchor(spec.code)}
                        className="deal-memo__module"
                        data-excluded={!provision.included}
                        data-invalid={moduleErrors.length > 0}
                        aria-labelledby={`${moduleAnchor(spec.code)}-title`}
                      >
                        <div className="deal-memo__module-head">
                          <div>
                            <h3 id={`${moduleAnchor(spec.code)}-title`}>{spec.label}</h3>
                            <p>{spec.description}</p>
                          </div>
                          <div className="deal-memo__badges">
                            {badgesFor(spec).map((badge) => (
                              <span key={badge.label} className="deal-memo__badge" data-tone={badge.tone}>
                                {badge.label}
                              </span>
                            ))}
                          </div>
                        </div>
                        {toggleable ? (
                          <label className="deal-memo__check">
                            <input
                              type="checkbox"
                              checked={provision.included}
                              onChange={(e) => update(spec.code, { included: e.target.checked })}
                            />
                            Include {spec.label.toLowerCase()}
                          </label>
                        ) : null}
                        {spec.placeholder ? <p className="deal-memo__note">{spec.placeholder.text}</p> : null}
                        {provision.included ? (
                          <ModuleFieldsEditor
                            spec={spec}
                            value={provision.value}
                            errors={moduleErrors}
                            onChange={(value) => update(spec.code, { value })}
                          />
                        ) : null}
                        {moduleErrors.filter((e) => !e.field).map((error, index) => (
                          <p key={index} className="deal-memo__field-error">
                            {error.message}
                          </p>
                        ))}
                      </article>
                    );
                  })}
                </section>
              );
            })}

            <div className="deal-memo__compose-footer">
              <p className="deal-memo__sub" aria-live="polite">
                {status ?? (gate.ok ? "Ready to send." : `${remaining.length} item${remaining.length === 1 ? "" : "s"} to finish before sending.`)}
              </p>
              <div className="deal-memo__actions">
                <button type="button" className="deal-memo__btn" data-variant="secondary" disabled={pending} onClick={() => submit(false)}>
                  Save draft
                </button>
                <button type="submit" className="deal-memo__btn" disabled={pending} aria-describedby="deal-memo-send-help">
                  {pending ? "Saving…" : "Send to talent"}
                </button>
              </div>
              <p id="deal-memo-send-help" className="deal-memo__sr-only">
                Sending checks required modules and the talent release on the server.
              </p>
            </div>
          </form>

          <aside className="deal-memo__aside" aria-label="Deal summary">
            <FeePreview
              heading="Fee preview"
              viewer="industry"
              lines={deal.lines}
              talentDealCents={fees.talentDealCents}
              platformFeeBps={fees.platformFeeBps}
              platformFeeCents={fees.platformFeeCents}
              chargeAmountCents={fees.chargeAmountCents}
              agencyClause={agencyOn}
            />
            <section className="deal-memo__panel" aria-labelledby="deal-memo-checklist-heading">
              <h2 id="deal-memo-checklist-heading">Before you send</h2>
              {remaining.length ? (
                <ul className="deal-memo__stack" style={{ gap: 6, paddingLeft: 18, margin: 0 }}>
                  {remaining.map((error, index) => (
                    <li key={index} className="deal-memo__sub">
                      {error.message}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="deal-memo__note" data-tone="success">All required terms are complete.</p>
              )}
              <p className="deal-memo__sub" style={{ marginTop: 12 }}>
                Talent can negotiate before payout setup. Pay unlocks once they finish it.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
