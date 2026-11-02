import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  acceptAllProvisions,
  agreementCounselGate,
  applyIndustryReplies,
  applyTalentFlags,
  BOOKING_ERROR_CODES,
  BOOKING_MAX_CHARGE_CENTS,
  BOOKING_TEMPLATE_KEYS,
  composeProvisions,
  computeBookingFees,
  computeTalentDeal,
  CONTRACT_LEGAL_DRAFT,
  CONTRACT_LEGAL_EXISTING,
  decideDealMemoCreate,
  defaultProvisions,
  destinationChargeParams,
  DRAFT_LEGAL_TEXT,
  DRAFT_LEGAL_VERSION,
  EXHIBIT_A_PLACEHOLDER_VERSION,
  type FieldSpec,
  getModuleSpec,
  isAvailabilityEligible,
  memoStatusChip,
  MODULE_CODES,
  openFlagCount,
  type ProvisionRecord,
  readyExpiry,
  resolveBookingTemplate,
  validateForSend,
} from "../src/lib/booking/deal-memo";
import { dealMemoNotificationHref } from "../src/lib/booking/deal-memo-routes";

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

  it("keeps tour totals unchanged when new rate keys are submitted", () => {
    const { provisions, errors } = composeProvisions([
      {
        moduleCode: "rates",
        value: {
          rehearsal_day_rate_cents: 50_000,
          rehearsal_days: 10,
          tour_weekly_rate_cents: 400_000,
          tour_weeks: 6,
          flat_fee_cents: 99_000,
          show_rate_cents: 1,
          show_count: 9,
          day_rate_cents: 1,
          work_days: 9,
          week_rate_cents: 1,
          work_weeks: 9,
          shoot_day_rate_cents: 1,
          shoot_days: 9,
        },
      },
    ]);
    assert.deepEqual(errors, []);
    const rates = find(provisions, "rates").value;
    assert.equal(rates.flat_fee_cents, undefined);
    assert.equal(rates.show_rate_cents, undefined);
    assert.equal("flat_fee_cents" in rates, false);
    const tourFields = getModuleSpec("rates")?.fields.map((field) => field.key) ?? [];
    for (const key of ["flat_fee_cents", "show_rate_cents", "day_rate_cents", "week_rate_cents", "shoot_day_rate_cents"]) {
      assert.equal(tourFields.includes(key), false, key);
    }
    assert.equal(computeTalentDeal(provisions).talentDealCents, 50_000 * 10 + 400_000 * 6);
  });

  it("adds flat, show, day, week, and shoot lines only when those keys are non-zero", () => {
    const rates = {
      flat_fee_cents: 50_000,
      show_rate_cents: 1_000,
      show_count: 3,
      day_rate_cents: 2_000,
      work_days: 4,
      week_rate_cents: 3_000,
      work_weeks: 2,
      shoot_day_rate_cents: 4_000,
      shoot_days: 5,
      overtime_hourly_cents: 9_999,
    };
    const deal = computeTalentDeal([
      { ...blank("rates"), value: rates },
      { ...blank("per_diem"), value: { domestic_cents: 8_000 } },
      { ...blank("travel"), value: { ground_transport: true } },
    ]);
    assert.deepEqual(
      deal.lines.map((line) => line.label),
      [
        "Flat compensation",
        "Performances (3)",
        "Work days (4)",
        "Work weeks (2)",
        "Shoot days (5)",
      ],
    );
    assert.equal(deal.talentDealCents, 50_000 + 1_000 * 3 + 2_000 * 4 + 3_000 * 2 + 4_000 * 5);
    const zeros = computeTalentDeal([{ ...blank("rates"), value: { flat_fee_cents: 0, show_rate_cents: 1_000, show_count: 0 } }]);
    assert.equal(zeros.talentDealCents, 0);
  });
});

function blank(code: string): ProvisionRecord {
  return {
    module_code: code,
    section: "money",
    sort_order: 0,
    included: true,
    value: {},
    previous_included: null,
    previous_value: null,
    state: "pending",
    talent_flag: null,
    talent_proposed_value: null,
    talent_note: null,
    industry_reply: null,
    industry_decline_reason: null,
    industry_note: null,
  };
}

function enumValues(templateKey: string, moduleCode: string, fieldKey: string): string[] {
  const field = getModuleSpec(moduleCode, templateKey)?.fields.find((item) => item.key === fieldKey);
  assert.equal(field?.type, "enum");
  return (field as Extract<FieldSpec, { type: "enum" }>).options.map((option) => option.value);
}

function dateKinds(templateKey: string): string[] {
  const field = getModuleSpec("work_dates", templateKey)?.fields.find((item) => item.key === "blocks");
  assert.equal(field?.type, "date_blocks");
  return (field as Extract<FieldSpec, { type: "date_blocks" }>).kinds.map((kind) => kind.value);
}

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
    for (const code of [
      "CONNECT_ONBOARDING_REQUIRED",
      "MEMO_NOT_READY",
      "ALREADY_PAID",
      "FEE_MISMATCH",
      "AVAILABILITY_NOT_ELIGIBLE",
      "TEMPLATE_UNSUPPORTED",
      "TEMPLATE_PENDING_COUNSEL",
      "EXECUTED_CONTRACT_EXISTS",
    ]) {
      assert.ok((BOOKING_ERROR_CODES as readonly string[]).includes(code), code);
    }
  });

  it("resolves an explicit agreement key and still infers tour", () => {
    const award = resolveBookingTemplate({ requestedKey: "award_show", project: { id: "p2", enabled_modules: { classes: true } } });
    assert.equal(award.ok && award.templateKey, "award_show");
    assert.deepEqual(BOOKING_TEMPLATE_KEYS, [
      "tour_live_dancer",
      "award_show",
      "residency",
      "television_film",
      "standard_performance",
      "flat_scope",
    ]);
  });
});

const NEW_TEMPLATES = ["award_show", "residency", "television_film", "standard_performance", "flat_scope"] as const;

describe("additional agreement templates", () => {
  it("normalizes each template with sorted role defaults, money limits, counts, and date kinds", () => {
    assert.deepEqual(enumValues("award_show", "services_role", "role"), [
      "ensemble_dancer",
      "featured_dancer",
      "presenter_support",
    ]);
    assert.equal(defaultProvisions("award_show").find((p) => p.module_code === "services_role")?.value.role, "ensemble_dancer");
    assert.deepEqual(enumValues("residency", "services_role", "role"), ["ensemble_dancer", "principal_dancer", "swing"]);
    assert.deepEqual(enumValues("television_film", "services_role", "role"), ["ensemble_dancer", "featured_dancer", "principal_dancer"]);
    assert.deepEqual(enumValues("standard_performance", "services_role", "role"), ["ensemble_dancer", "featured_dancer", "swing"]);
    assert.equal(getModuleSpec("services_role", "flat_scope")?.fields.some((field) => field.key === "role"), false);

    assert.deepEqual(dateKinds("award_show"), ["rehearsal", "show"]);
    assert.deepEqual(dateKinds("residency"), ["rehearsal", "performance", "dark"]);
    assert.deepEqual(dateKinds("television_film"), ["fitting", "rehearsal", "shoot"]);
    assert.deepEqual(dateKinds("standard_performance"), ["rehearsal", "performance"]);
    assert.deepEqual(dateKinds("flat_scope"), ["work"]);

    for (const templateKey of NEW_TEMPLATES) {
      const { provisions, errors } = composeProvisions([], templateKey);
      assert.deepEqual(errors, [], templateKey);
      assert.ok(provisions.length > 0);
      const legal = provisions.filter((provision) => provision.section === "legal");
      assert.ok(legal.length >= 2, templateKey);
      for (const provision of legal) {
        assert.equal(provision.value.placeholder_version, DRAFT_LEGAL_VERSION);
        const placeholder = getModuleSpec(provision.module_code, templateKey)?.placeholder;
        assert.equal(placeholder?.version, DRAFT_LEGAL_VERSION);
        assert.equal(placeholder?.text, DRAFT_LEGAL_TEXT);
      }
      const money = getModuleSpec("rates", templateKey)?.fields.find((field) => field.type === "money");
      assert.equal(money && money.type === "money" ? money.max : 0, 50_000_000);
      const count = getModuleSpec("rates", templateKey)?.fields.find((field) => field.type === "int");
      if (count && count.type === "int") {
        assert.equal(count.min, 0);
        assert.equal(count.max, 365);
      }
    }

    const overMoney = composeProvisions(
      [{ moduleCode: "rates", value: { flat_fee_cents: 50_000_001 } }],
      "flat_scope",
    );
    assert.ok(overMoney.errors.some((error) => error.field === "flat_fee_cents"));
    const atMoney = composeProvisions(
      [{ moduleCode: "rates", value: { flat_fee_cents: 50_000_000 } }],
      "flat_scope",
    );
    assert.equal(atMoney.errors.some((error) => error.field === "flat_fee_cents"), false);

    const overCount = composeProvisions(
      [{ moduleCode: "rates", value: { show_rate_cents: 100, show_count: 366, flat_fee_cents: 0, overtime_hourly_cents: 0 } }],
      "standard_performance",
    );
    assert.ok(overCount.errors.some((error) => error.field === "show_count"));
    const atCount = composeProvisions(
      [{ moduleCode: "rates", value: { show_rate_cents: 100, show_count: 365, flat_fee_cents: 0, overtime_hourly_cents: 0 } }],
      "standard_performance",
    );
    assert.equal(atCount.errors.some((error) => error.field === "show_count"), false);

    const badKind = composeProvisions(
      [{ moduleCode: "work_dates", value: { blocks: [{ kind: "tour", start_date: "2026-11-01", end_date: "2026-11-02", location: "Los Angeles" }] } }],
      "award_show",
    );
    assert.ok(badKind.errors.some((error) => error.moduleCode === "work_dates"));
    const showKind = composeProvisions(
      [{ moduleCode: "work_dates", value: { blocks: [{ kind: "show", start_date: "2026-11-01", end_date: "2026-11-02", location: "Los Angeles" }] } }],
      "award_show",
    );
    assert.equal(showKind.errors.some((error) => error.moduleCode === "work_dates"), false);

    assert.equal(find(composeProvisions([], "residency").provisions, "specialty_talent").value.skills, undefined);
    assert.equal(find(composeProvisions([], "television_film").provisions, "usage_buyout").value.territory, "");
    assert.equal(find(composeProvisions([], "award_show").provisions, "usage_buyout").value.territory, undefined);
    assert.equal(find(composeProvisions([], "flat_scope").provisions, "payment_terms").value.net_days, "on_signature");
    assert.equal(getModuleSpec("governing_law")?.placeholder?.version, EXHIBIT_A_PLACEHOLDER_VERSION);
    assert.notEqual(getModuleSpec("governing_law")?.placeholder?.text, DRAFT_LEGAL_TEXT);
  });

  it("refuses to create or send a draft template and links a booking when counsel has approved it", () => {
    const booking = {
      id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      industry_user_id: "industry",
      talent_user_id: "talent",
      project_id: "project",
      availability_check_request_id: null,
      deal_memo_id: null,
    };
    const availability = {
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      requester_id: "industry",
      talent_id: "talent",
      status: "submitted" as const,
      response_kind: "available" as const,
      project_id: "project",
    };
    for (const templateKey of NEW_TEMPLATES) {
      const refused = decideDealMemoCreate({
        requesterId: "industry",
        templateKey,
        legalStatus: CONTRACT_LEGAL_DRAFT,
        availability: null,
        booking,
        activeExecutedContract: false,
        openMemoId: null,
      });
      assert.equal(refused.ok, false);
      assert.equal(refused.ok ? null : refused.code, "TEMPLATE_PENDING_COUNSEL");
    }
    assert.equal(agreementCounselGate(CONTRACT_LEGAL_EXISTING).ok, true);
    assert.equal(agreementCounselGate("draft_pending_counsel").ok, false);

    const linked = decideDealMemoCreate({
      requesterId: "industry",
      templateKey: "tour_live_dancer",
      legalStatus: CONTRACT_LEGAL_EXISTING,
      availability,
      booking: { ...booking, availability_check_request_id: availability.id },
      activeExecutedContract: false,
      openMemoId: null,
    });
    assert.equal(linked.ok, true);
    if (linked.ok) {
      assert.equal(linked.bookingId, booking.id);
      assert.equal(linked.linkBookingId, booking.id);
      assert.equal(linked.availabilityRequestId, availability.id);
      assert.equal(linked.talentUserId, "talent");
    }

    const fromBooking = decideDealMemoCreate({
      requesterId: "industry",
      templateKey: "flat_scope",
      legalStatus: CONTRACT_LEGAL_EXISTING,
      availability: null,
      booking,
      activeExecutedContract: false,
      openMemoId: null,
    });
    assert.equal(fromBooking.ok, true);
    if (fromBooking.ok) {
      assert.equal(fromBooking.availabilityRequestId, null);
      assert.equal(fromBooking.bookingId, booking.id);
      assert.equal(fromBooking.linkBookingId, booking.id);
    }

    const tourWithoutAvailability = decideDealMemoCreate({
      requesterId: "industry",
      templateKey: "tour_live_dancer",
      legalStatus: CONTRACT_LEGAL_EXISTING,
      availability: null,
      booking,
      activeExecutedContract: false,
      openMemoId: null,
    });
    assert.equal(tourWithoutAvailability.ok ? null : tourWithoutAvailability.code, "AVAILABILITY_NOT_ELIGIBLE");

    const recorded = decideDealMemoCreate({
      requesterId: "industry",
      templateKey: "flat_scope",
      legalStatus: CONTRACT_LEGAL_EXISTING,
      availability: null,
      booking,
      activeExecutedContract: true,
      openMemoId: null,
    });
    assert.equal(recorded.ok, false);
    assert.equal(recorded.ok ? null : recorded.code, "EXECUTED_CONTRACT_EXISTS");
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

describe("notification routing", () => {
  const memoId = "6f1c2f5e-2b8e-4a55-9d0c-0d6c3c1b9a11";
  it("routes each recipient to their own shell", () => {
    assert.equal(
      dealMemoNotificationHref({ type: "booking_deal_memo", data: { memo_id: memoId, recipient_role: "talent" } }),
      `/deal-memos/${memoId}`,
    );
    assert.equal(
      dealMemoNotificationHref({ type: "booking_deal_memo", data: { memo_id: memoId, recipient_role: "industry" } }),
      `/bookings/deal-memos/${memoId}`,
    );
  });

  it("ignores other types and malformed payloads", () => {
    assert.equal(dealMemoNotificationHref({ type: "casting_invite", data: { memo_id: memoId, recipient_role: "talent" } }), null);
    assert.equal(dealMemoNotificationHref({ type: "booking_deal_memo", data: { memo_id: "../x", recipient_role: "talent" } }), null);
    assert.equal(dealMemoNotificationHref({ type: "booking_deal_memo", data: { memo_id: memoId } }), null);
  });
});
