import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  acceptAllProvisions,
  applyIndustryReplies,
  applyTalentFlags,
  BOOKING_ERROR_CODES,
  BOOKING_MAX_CHARGE_CENTS,
  composeProvisions,
  computeBookingFees,
  computeTalentDeal,
  defaultProvisions,
  destinationChargeParams,
  isAvailabilityEligible,
  memoStatusChip,
  MODULE_CODES,
  openFlagCount,
  type ProvisionRecord,
  readyExpiry,
  resolveBookingTemplate,
  validateForSend,
} from "../src/lib/booking/deal-memo";

function readyToSend(): ProvisionRecord[] {
  const { provisions, errors } = composeProvisions([
    { moduleCode: "services_role", value: { role: "principal_dancer", role_title: "Principal dancer", exclusive_to_artist: false } },
    {
      moduleCode: "work_dates",
      value: { blocks: [{ kind: "tour", start_date: "2026-11-01", end_date: "2026-12-15", location: "North America" }] },
    },
    {
      moduleCode: "rates",
      value: { rehearsal_day_rate_cents: 50_000, rehearsal_days: 10, tour_weekly_rate_cents: 400_000, tour_weeks: 6 },
    },
    { moduleCode: "talent_release", value: { release_required: true, release_approved: true } },
  ]);
  assert.deepEqual(errors, []);
  return provisions;
}

function find(provisions: ProvisionRecord[], code: string) {
  const provision = provisions.find((p) => p.module_code === code);
  assert.ok(provision, code);
  return provision;
}

describe("fee on top (PSE FINAL lock)", () => {
  it("charges deal + 10% and sends the full deal to the talent", () => {
    const fees = computeBookingFees(2_900_000);
    assert.equal(fees.platformFeeCents, 290_000);
    assert.equal(fees.chargeAmountCents, 3_190_000);
    assert.equal(fees.talentReceivesCents, 2_900_000);
    assert.deepEqual(destinationChargeParams(fees, "acct_123"), {
      amount: 3_190_000,
      currency: "usd",
      application_fee_amount: 290_000,
      transfer_data: { destination: "acct_123" },
    });
  });

  it("rounds the fee half-up like the SQL constraint", () => {
    assert.equal(computeBookingFees(105).platformFeeCents, 11);
    assert.equal(computeBookingFees(104).platformFeeCents, 10);
    assert.equal(computeBookingFees(0).chargeAmountCents, 0);
  });

  it("never pays the talent 90% of the charge", () => {
    const fees = computeBookingFees(100_000);
    assert.notEqual(fees.talentReceivesCents, Math.round(fees.chargeAmountCents * 0.9));
    assert.equal(fees.chargeAmountCents - fees.platformFeeCents, fees.talentReceivesCents);
  });

  it("keeps the agency clause out of the Motiion fee", () => {
    const base = readyToSend();
    const withAgency = base.map((p) =>
      p.module_code === "agency_commission"
        ? { ...p, included: true, value: { agency_name: "Bloc", commission_bps: 1500 } }
        : p
    );
    assert.equal(computeTalentDeal(withAgency).talentDealCents, computeTalentDeal(base).talentDealCents);
    assert.equal(find(base, "agency_commission").included, false);
  });
});

describe("talent deal", () => {
  it("sums guaranteed rates, hazard bump on the rate base, captain and specialty bumps", () => {
    const provisions = readyToSend().map((p) => {
      if (p.module_code === "hazardous_work") return { ...p, value: { hazards: ["heights"], bump_bps: 1000 } };
      if (p.module_code === "dance_captain") return { ...p, included: true, value: { bump_weekly_cents: 50_000, starts_before_first_date: true } };
      if (p.module_code === "specialty_talent") return { ...p, included: true, value: { skills: [], bump_cents: 25_000 } };
      return p;
    });
    const base = 50_000 * 10 + 400_000 * 6;
    const { talentDealCents } = computeTalentDeal(provisions);
    assert.equal(talentDealCents, base + base / 10 + 50_000 * 6 + 25_000);
  });

  it("ignores values on modules that are not included", () => {
    const provisions = readyToSend().map((p) =>
      p.module_code === "dance_captain" ? { ...p, included: false, value: { bump_weekly_cents: 99_000 } } : p
    );
    assert.equal(computeTalentDeal(provisions).talentDealCents, 50_000 * 10 + 400_000 * 6);
  });
});

describe("send gate", () => {
  it("passes a complete memo", () => {
    assert.deepEqual(validateForSend(readyToSend()), { ok: true, code: null, errors: [] });
  });

  it("requires role title, dates and a deal", () => {
    const result = validateForSend(defaultProvisions());
    assert.equal(result.ok, false);
    const modules = new Set(result.errors.map((e) => e.moduleCode));
    assert.ok(modules.has("services_role"));
    assert.ok(modules.has("work_dates"));
    assert.ok(modules.has("rates"));
  });

  it("blocks an unapproved talent release", () => {
    const provisions = readyToSend().map((p) =>
      p.module_code === "talent_release" ? { ...p, value: { release_required: true, release_approved: false } } : p
    );
    const result = validateForSend(provisions);
    assert.equal(result.code, "RELEASE_NOT_APPROVED");
  });

  it("rejects charges above the card ceiling", () => {
    const provisions = readyToSend().map((p) =>
      p.module_code === "rates" ? { ...p, value: { ...p.value, tour_weekly_rate_cents: 20_000_000, tour_weeks: 104 } } : p
    );
    assert.ok(computeBookingFees(computeTalentDeal(provisions).talentDealCents).chargeAmountCents > BOOKING_MAX_CHARGE_CENTS);
    assert.equal(validateForSend(provisions).ok, false);
  });

  it("rejects unknown modules and invalid values on compose", () => {
    const { errors } = composeProvisions([
      { moduleCode: "bloc_paste", value: {} },
      { moduleCode: "work_dates", value: { blocks: [{ kind: "tour", start_date: "2026-02-30", end_date: "" }] } },
    ]);
    assert.ok(errors.some((e) => e.moduleCode === "bloc_paste"));
    assert.ok(errors.some((e) => e.moduleCode === "work_dates"));
  });

  it("keeps required modules included even when compose asks to drop them", () => {
    const { provisions } = composeProvisions([{ moduleCode: "rates", included: false }]);
    assert.equal(find(provisions, "rates").included, true);
    assert.equal(provisions.length, MODULE_CODES.length);
  });
});

describe("negotiation", () => {
  it("talent flags become change requests; everything else is accepted", () => {
    const result = applyTalentFlags(readyToSend(), [
      { moduleCode: "rates", flag: "dispute", proposedValue: { rehearsal_day_rate_cents: 60_000, rehearsal_days: 10, tour_weekly_rate_cents: 400_000, tour_weeks: 6 }, note: "Market rate" },
      { moduleCode: "meals", flag: "add" },
    ]);
    assert.ok(result.ok);
    assert.equal(openFlagCount(result.provisions), 2);
    assert.equal(find(result.provisions, "hotel").state, "accepted");
    assert.equal(find(result.provisions, "rates").talent_note, "Market rate");
  });

  it("requires at least one real change and blocks placeholders and required removals", () => {
    const none = applyTalentFlags(readyToSend(), []);
    assert.equal(none.ok, false);
    const same = applyTalentFlags(readyToSend(), [{ moduleCode: "baggage", flag: "dispute", proposedValue: { checked_bags: 1 } }]);
    assert.equal(same.ok, false);
    const legal = applyTalentFlags(readyToSend(), [{ moduleCode: "motiion_terms", flag: "remove" }]);
    assert.equal(legal.ok, false);
    const required = applyTalentFlags(readyToSend(), [{ moduleCode: "rates", flag: "remove" }]);
    assert.equal(required.ok, false);
    const agency = applyTalentFlags(readyToSend(), [{ moduleCode: "agency_commission", flag: "add" }]);
    assert.equal(agency.ok, false);
  });

  it("industry must answer every flag; decline needs a reason and Other needs a note", () => {
    const flagged = applyTalentFlags(readyToSend(), [
      { moduleCode: "billing_credit", flag: "remove" },
      { moduleCode: "baggage", flag: "dispute", proposedValue: { checked_bags: 2 } },
    ]);
    assert.ok(flagged.ok);
    const missing = applyIndustryReplies(flagged.provisions, [{ moduleCode: "baggage", reply: "accept_change" }]);
    assert.equal(missing.ok, false);
    const otherWithoutNote = applyIndustryReplies(flagged.provisions, [
      { moduleCode: "baggage", reply: "decline", declineReason: "other" },
      { moduleCode: "billing_credit", reply: "accept_change" },
    ]);
    assert.equal(otherWithoutNote.ok, false);
    const counterRemoval = applyIndustryReplies(flagged.provisions, [
      { moduleCode: "baggage", reply: "accept_change" },
      { moduleCode: "billing_credit", reply: "counter", counterValue: {} },
    ]);
    assert.equal(counterRemoval.ok, false);
  });

  it("industry replies apply changes with a before → after diff and hand back to talent", () => {
    const flagged = applyTalentFlags(readyToSend(), [
      { moduleCode: "billing_credit", flag: "remove" },
      { moduleCode: "baggage", flag: "dispute", proposedValue: { checked_bags: 3 } },
      { moduleCode: "meals", flag: "add" },
    ]);
    assert.ok(flagged.ok);
    const replied = applyIndustryReplies(flagged.provisions, [
      { moduleCode: "billing_credit", reply: "accept_change" },
      { moduleCode: "baggage", reply: "counter", counterValue: { checked_bags: 2 }, note: "Two bags" },
      { moduleCode: "meals", reply: "decline", declineReason: "budget" },
    ]);
    assert.ok(replied.ok);
    const credit = find(replied.provisions, "billing_credit");
    assert.equal(credit.included, false);
    assert.equal(credit.previous_included, true);
    const baggage = find(replied.provisions, "baggage");
    assert.deepEqual(baggage.value, { checked_bags: 2 });
    assert.deepEqual(baggage.previous_value, { checked_bags: 1 });
    assert.equal(baggage.state, "pending");
    assert.equal(find(replied.provisions, "meals").included, false);
    assert.equal(openFlagCount(replied.provisions), 0);

    const reflagged = applyTalentFlags(replied.provisions, [
      { moduleCode: "baggage", flag: "dispute", proposedValue: { checked_bags: 3 } },
    ]);
    assert.ok(reflagged.ok);
    assert.equal(find(reflagged.provisions, "baggage").previous_value, null);
    assert.equal(find(reflagged.provisions, "billing_credit").industry_reply, null);
    assert.ok(acceptAllProvisions(replied.provisions).every((p) => p.state === "accepted"));
  });
});

describe("entry and template", () => {
  it("only confirmed availability starts a booking", () => {
    assert.equal(isAvailabilityEligible({ status: "submitted", response_kind: "available" }), true);
    assert.equal(isAvailabilityEligible({ status: "submitted", response_kind: "available_with_conflict" }), true);
    assert.equal(isAvailabilityEligible({ status: "submitted", response_kind: "unavailable" }), false);
    assert.equal(isAvailabilityEligible({ status: "pending", response_kind: null }), false);
    assert.equal(isAvailabilityEligible(null), false);
  });

  it("resolves tour_live_dancer from abilities, never project_type", () => {
    const tour = resolveBookingTemplate({ project: { id: "p1", enabled_modules: { casting: true } } });
    assert.ok(tour.ok);
    assert.equal(tour.templateKey, "tour_live_dancer");
    assert.deepEqual(tour.softKind.abilities, ["casting"]);
    assert.ok(resolveBookingTemplate({ project: null }).ok);
    const classes = resolveBookingTemplate({ project: { id: "p2", enabled_modules: { classes: true } } });
    assert.equal(classes.ok, false);
    const other = resolveBookingTemplate({ requestedKey: "commercial_dancer", project: null });
    assert.equal(other.ok ? null : other.code, "TEMPLATE_UNSUPPORTED");
  });

  it("exposes the shared error codes", () => {
    for (const code of ["CONNECT_ONBOARDING_REQUIRED", "MEMO_NOT_READY", "ALREADY_PAID", "FEE_MISMATCH", "AVAILABILITY_NOT_ELIGIBLE", "TEMPLATE_UNSUPPORTED"]) {
      assert.ok((BOOKING_ERROR_CODES as readonly string[]).includes(code), code);
    }
  });
});

describe("status chips", () => {
  const now = Date.parse("2026-09-29T00:00:00Z");
  it("maps states per viewer", () => {
    assert.equal(memoStatusChip({ status: "draft" }, "industry", now), "Draft offer");
    assert.equal(memoStatusChip({ status: "offered", awaiting_party: "talent" }, "talent", now), "Awaiting talent");
    assert.equal(memoStatusChip({ status: "negotiating", awaiting_party: "industry" }, "industry", now), "Changes requested");
    assert.equal(memoStatusChip({ status: "negotiating", awaiting_party: "industry" }, "talent", now), "Awaiting industry");
    assert.equal(memoStatusChip({ status: "payment_pending", expires_at: "2026-10-01T00:00:00Z" }, "industry", now), "Ready for payment");
    assert.equal(memoStatusChip({ status: "payment_pending", expires_at: "2026-09-28T00:00:00Z" }, "industry", now), "Expired");
    assert.equal(memoStatusChip({ status: "paid" }, "talent", now), "Paid / Booked");
    assert.equal(memoStatusChip({ status: "cancelled" }, "talent", now), "Canceled");
  });

  it("Ready for payment expires 7 days after accept", () => {
    assert.equal(readyExpiry(new Date("2026-09-29T00:00:00Z")), "2026-10-06T00:00:00.000Z");
  });
});
