/**
 * MOT-94 booking deal memo template + negotiation rules.
 *
 * Pure TypeScript (no Deno / Node / npm imports) so the same file runs in Edge Functions,
 * the Next.js website (imported via `src/lib/booking/deal-memo.ts`) and `node --test` contract tests.
 * iOS mirrors these codes and field keys; change them only with a coordinated app release.
 */

export const BOOKING_DEAL_MEMO_PURPOSE = "booking_deal_memo";
export const TOUR_LIVE_DANCER = "tour_live_dancer";
export const AWARD_SHOW = "award_show";
export const RESIDENCY = "residency";
export const TELEVISION_FILM = "television_film";
export const STANDARD_PERFORMANCE = "standard_performance";
export const FLAT_SCOPE = "flat_scope";
/** Wire keys from Motiion/Models/BookingDealMemoTemplate.swift. Tour stays first. */
export const BOOKING_TEMPLATE_KEYS = [
  TOUR_LIVE_DANCER,
  AWARD_SHOW,
  RESIDENCY,
  TELEVISION_FILM,
  STANDARD_PERFORMANCE,
  FLAT_SCOPE,
] as const;
export type BookingTemplateKey = (typeof BOOKING_TEMPLATE_KEYS)[number];
export const BOOKING_TEMPLATE_VERSION = 1;
/** `booking_contract_templates.legal_status`. Only `existing` may be created or sent. */
export const CONTRACT_LEGAL_EXISTING = "existing";
export const CONTRACT_LEGAL_DRAFT = "draft_pending_counsel";
/**
 * Operational draft copy from BookingDealMemoAdditionalTemplates.swift.
 * This is not approved counsel language.
 */
export const DRAFT_LEGAL_VERSION = "motiion-draft-pending-counsel-v0";
export const DRAFT_LEGAL_TEXT =
  "Draft for review. This is not approved legal language and cannot be sent until counsel approves it.";

/** Jay lock: Motiion platform fee is 10% charged on top of the talent deal. */
export const BOOKING_PLATFORM_FEE_BPS = 1000;
export const BOOKING_CURRENCY = "usd";
export const BOOKING_NOTE_MAX = 280;
export const BOOKING_READY_EXPIRY_DAYS = 7;
export const BOOKING_MIN_DEAL_CENTS = 100;
/** Stripe card PaymentIntent ceiling is $999,999.99. */
export const BOOKING_MAX_CHARGE_CENTS = 99_999_999;
export const BOOKING_SIGNATURE_MAX = 120;

/** Counsel-owned legal text is not in the product yet; these versions mark placeholders. */
export const EXHIBIT_A_PLACEHOLDER_VERSION = "motiion-exhibit-a-placeholder-v0";
export const EOR_PLACEHOLDER_VERSION = "motiion-eor-placeholder-v0";

export const BOOKING_ERROR_CODES = [
  "AVAILABILITY_NOT_ELIGIBLE",
  "TEMPLATE_UNSUPPORTED",
  "TEMPLATE_PENDING_COUNSEL",
  "EXECUTED_CONTRACT_EXISTS",
  "COMMUNITY_NOT_ALLOWED",
  "MEMO_EXISTS",
  "REQUIRED_MODULES_MISSING",
  "RELEASE_NOT_APPROVED",
  "INVALID_MODULE_VALUE",
  "INVALID_FLAG",
  "INVALID_REPLY",
  "NOT_YOUR_TURN",
  "MEMO_NOT_READY",
  "MEMO_EXPIRED",
  "WORK_DATES_PASSED",
  "MEMO_CONFLICT",
  "SIGNATURE_REQUIRED",
  "CONNECT_ONBOARDING_REQUIRED",
  "ALREADY_PAID",
  "FEE_MISMATCH",
  "FORBIDDEN",
  "NOT_FOUND",
] as const;
export type BookingErrorCode = (typeof BOOKING_ERROR_CODES)[number];

export const MEMO_STATUSES = [
  "draft",
  "offered",
  "negotiating",
  "accepted",
  "payment_pending",
  "paid",
  "declined",
  "cancelled",
  "expired",
] as const;
export type MemoStatus = (typeof MEMO_STATUSES)[number];
export type MemoParty = "industry" | "talent";

export const TERMINAL_MEMO_STATUSES: readonly MemoStatus[] = ["paid", "declined", "cancelled", "expired"];

export const DECLINE_REASONS = [
  { value: "budget", label: "Budget" },
  { value: "not_available", label: "Not available" },
  { value: "policy", label: "Policy" },
  { value: "other", label: "Other" },
] as const;
export type DeclineReason = (typeof DECLINE_REASONS)[number]["value"];

export const SECTIONS = [
  { code: "role_credit", label: "Role & credit" },
  { code: "dates", label: "Dates" },
  { code: "money", label: "Money" },
  { code: "usage_extras", label: "Usage & extras" },
  { code: "travel_stay", label: "Travel & stay" },
  { code: "protection", label: "Protection" },
  { code: "legal", label: "Legal" },
] as const;
export type SectionCode = (typeof SECTIONS)[number]["code"];

type Option = { value: string; label: string };

export type FieldSpec =
  | { key: string; label: string; type: "text"; maxLength: number; required?: boolean; help?: string }
  | { key: string; label: string; type: "enum"; options: Option[]; help?: string }
  | { key: string; label: string; type: "multi"; options: Option[]; help?: string }
  | { key: string; label: string; type: "money"; required?: boolean; max?: number; help?: string }
  | { key: string; label: string; type: "int"; min: number; max: number; unit?: string; help?: string }
  | { key: string; label: string; type: "bool"; help?: string }
  | { key: string; label: string; type: "bps"; min: number; max: number; help?: string }
  | { key: string; label: string; type: "date_blocks"; kinds: Option[]; minItems: number; maxItems: number };

export type ModuleSpec = {
  code: string;
  section: SectionCode;
  label: string;
  description: string;
  /** Required modules must be included and valid before Send. */
  required: boolean;
  defaultIncluded: boolean;
  /** Talent may request removal (toggleable clause). */
  removable: boolean;
  /** Talent may request this add-on when it is not included. */
  talentAddable: boolean;
  /** Counsel-owned text; read-only for both parties. */
  placeholder?: { version: string; text: string };
  fields: FieldSpec[];
  defaults: Record<string, unknown>;
};

export type DateBlock = { kind: string; start_date: string; end_date: string; location: string };

const DATE_BLOCK_KINDS: Option[] = [
  { value: "rehearsal", label: "Rehearsal" },
  { value: "production_rehearsal", label: "Production rehearsal" },
  { value: "tour", label: "Tour dates" },
  { value: "travel", label: "Travel" },
];

const MODULES: ModuleSpec[] = [
  {
    code: "services_role",
    section: "role_credit",
    label: "Services / role",
    description: "The role the talent is booked for.",
    required: true,
    defaultIncluded: true,
    removable: false,
    talentAddable: false,
    fields: [
      {
        key: "role",
        label: "Role",
        type: "enum",
        options: [
          { value: "principal_dancer", label: "Principal dancer" },
          { value: "ensemble_dancer", label: "Ensemble dancer" },
          { value: "featured_dancer", label: "Featured dancer" },
          { value: "swing", label: "Swing" },
        ],
      },
      { key: "role_title", label: "Role title", type: "text", maxLength: 80, required: true },
      { key: "exclusive_to_artist", label: "Exclusive to the artist for the engagement", type: "bool" },
    ],
    defaults: { role: "principal_dancer", role_title: "", exclusive_to_artist: false },
  },
  {
    code: "billing_credit",
    section: "role_credit",
    label: "Billing / credit",
    description: "How the talent is credited.",
    required: false,
    defaultIncluded: true,
    removable: true,
    talentAddable: true,
    fields: [
      {
        key: "credit",
        label: "Credit",
        type: "enum",
        options: [
          { value: "shared_card_end_titles", label: "Shared card, end titles" },
          { value: "program_listing", label: "Program listing" },
          { value: "shared_card_and_program", label: "Shared card and program" },
        ],
      },
    ],
    defaults: { credit: "shared_card_end_titles" },
  },
  {
    code: "dance_captain",
    section: "role_credit",
    label: "Dance Captain",
    description: "Dance Captain duties with a weekly bump on top of the tour rate.",
    required: false,
    defaultIncluded: false,
    removable: true,
    talentAddable: true,
    fields: [
      { key: "bump_weekly_cents", label: "Weekly bump", type: "money", max: 5_000_000 },
      { key: "starts_before_first_date", label: "Duties start before the first show", type: "bool" },
    ],
    defaults: { bump_weekly_cents: 0, starts_before_first_date: true },
  },
  {
    code: "specialty_talent",
    section: "role_credit",
    label: "Specialty talent",
    description: "Specialty skills with a flat bump.",
    required: false,
    defaultIncluded: false,
    removable: true,
    talentAddable: true,
    fields: [
      {
        key: "skills",
        label: "Skills",
        type: "multi",
        options: [
          { value: "breaking", label: "Breaking" },
          { value: "tumbling", label: "Tumbling" },
          { value: "aerial", label: "Aerial" },
          { value: "stilts", label: "Stilts" },
          { value: "other", label: "Other specialty" },
        ],
      },
      { key: "bump_cents", label: "Flat bump", type: "money", max: 50_000_000 },
    ],
    defaults: { skills: [], bump_cents: 0 },
  },
  {
    code: "work_dates",
    section: "dates",
    label: "Work dates",
    description: "Rehearsal, production rehearsal and tour date blocks.",
    required: true,
    defaultIncluded: true,
    removable: false,
    talentAddable: false,
    fields: [{ key: "blocks", label: "Date blocks", type: "date_blocks", kinds: DATE_BLOCK_KINDS, minItems: 1, maxItems: 24 }],
    defaults: { blocks: [] },
  },
  {
    code: "rates",
    section: "money",
    label: "Rates",
    description: "Guaranteed rates. Rehearsal days and tour weeks make up the deal charged today.",
    required: true,
    defaultIncluded: true,
    removable: false,
    talentAddable: false,
    fields: [
      { key: "rehearsal_day_rate_cents", label: "Rehearsal day rate", type: "money", max: 10_000_000 },
      { key: "rehearsal_days", label: "Guaranteed rehearsal days", type: "int", min: 0, max: 365, unit: "days" },
      { key: "tour_weekly_rate_cents", label: "Weekly tour rate", type: "money", max: 20_000_000 },
      { key: "tour_weeks", label: "Guaranteed tour weeks", type: "int", min: 0, max: 104, unit: "weeks" },
      {
        key: "overtime_hourly_cents",
        label: "Overtime hourly rate",
        type: "money",
        max: 1_000_000,
        help: "Paid under the payment terms; not part of today's charge.",
      },
    ],
    defaults: {
      rehearsal_day_rate_cents: 0,
      rehearsal_days: 0,
      tour_weekly_rate_cents: 0,
      tour_weeks: 0,
      overtime_hourly_cents: 0,
    },
  },
  {
    code: "pro_rating",
    section: "money",
    label: "Pro-rating",
    description: "How partial weeks are paid.",
    required: false,
    defaultIncluded: true,
    removable: true,
    talentAddable: true,
    fields: [
      {
        key: "method",
        label: "Method",
        type: "enum",
        options: [
          { value: "seven_day_week", label: "1/7 of the weekly rate per day" },
          { value: "five_day_week", label: "1/5 of the weekly rate per day" },
          { value: "full_week", label: "Partial weeks paid as full weeks" },
        ],
      },
    ],
    defaults: { method: "seven_day_week" },
  },
  {
    code: "per_diem",
    section: "money",
    label: "Per diem",
    description: "Daily allowance on the road. Paid by the hiring entity; not part of today's charge.",
    required: false,
    defaultIncluded: true,
    removable: true,
    talentAddable: true,
    fields: [
      { key: "domestic_cents", label: "Domestic per day", type: "money", max: 100_000 },
      { key: "international_cents", label: "International per day", type: "money", max: 100_000 },
    ],
    defaults: { domestic_cents: 0, international_cents: 0 },
  },
  {
    code: "payment_terms",
    section: "money",
    label: "Payment method / terms",
    description: "The guaranteed deal is charged in full through Motiion when both sides accept.",
    required: true,
    defaultIncluded: true,
    removable: false,
    talentAddable: false,
    fields: [
      {
        key: "net_days",
        label: "Net terms for overtime and extras",
        type: "enum",
        options: [
          { value: "7", label: "Net 7" },
          { value: "14", label: "Net 14" },
          { value: "30", label: "Net 30" },
        ],
      },
    ],
    defaults: { net_days: "7" },
  },
  {
    code: "agency_commission",
    section: "money",
    label: "Agency commission",
    description: "Only when an agency represents the talent. Separate from Motiion's platform fee.",
    required: false,
    defaultIncluded: false,
    removable: true,
    talentAddable: false,
    fields: [
      { key: "agency_name", label: "Agency", type: "text", maxLength: 120, required: true },
      { key: "commission_bps", label: "Commission", type: "bps", min: 0, max: 2500 },
    ],
    defaults: { agency_name: "", commission_bps: 1000 },
  },
  {
    code: "usage_buyout",
    section: "usage_extras",
    label: "Usage / buyout",
    description: "How performances may be recorded or broadcast.",
    required: false,
    defaultIncluded: true,
    removable: false,
    talentAddable: false,
    fields: [
      {
        key: "usage",
        label: "Usage",
        type: "enum",
        options: [
          { value: "live_only", label: "Live performance only" },
          { value: "live_plus_promo", label: "Live plus promotional clips" },
          { value: "broadcast_buyout", label: "TV / stream buyout" },
        ],
      },
      { key: "buyout_fee_cents", label: "Buyout fee", type: "money", max: 50_000_000 },
    ],
    defaults: { usage: "live_only", buyout_fee_cents: 0 },
  },
  {
    code: "merchandising",
    section: "usage_extras",
    label: "Merchandising",
    description: "Use of the talent's likeness on merchandise.",
    required: false,
    defaultIncluded: true,
    removable: false,
    talentAddable: false,
    fields: [{ key: "likeness_allowed", label: "Likeness may be used on merchandise", type: "bool" }],
    defaults: { likeness_allowed: false },
  },
  {
    code: "additional_performances",
    section: "usage_extras",
    label: "Additional / non-scheduled performances",
    description: "One-off performances outside the scheduled dates.",
    required: false,
    defaultIncluded: true,
    removable: true,
    talentAddable: true,
    fields: [{ key: "per_show_cents", label: "Paid per additional show", type: "money", max: 5_000_000 }],
    defaults: { per_show_cents: 0 },
  },
  {
    code: "mfn",
    section: "usage_extras",
    label: "Most favored nations",
    description: "Terms match the best terms given to any dancer in the same role.",
    required: false,
    defaultIncluded: false,
    removable: true,
    talentAddable: true,
    fields: [],
    defaults: {},
  },
  {
    code: "hotel",
    section: "travel_stay",
    label: "Hotel",
    description: "Accommodation on the road.",
    required: false,
    defaultIncluded: true,
    removable: false,
    talentAddable: false,
    fields: [
      {
        key: "room",
        label: "Room",
        type: "enum",
        options: [
          { value: "single", label: "Single room" },
          { value: "shared", label: "Shared room" },
        ],
      },
      { key: "band_equivalent", label: "Same standard as the band", type: "bool" },
      { key: "wifi", label: "Wi-Fi included", type: "bool" },
    ],
    defaults: { room: "single", band_equivalent: true, wifi: true },
  },
  {
    code: "travel",
    section: "travel_stay",
    label: "Travel",
    description: "Flights and ground transport.",
    required: false,
    defaultIncluded: true,
    removable: false,
    talentAddable: false,
    fields: [
      {
        key: "air_class",
        label: "Air travel",
        type: "enum",
        options: [
          { value: "economy", label: "Economy" },
          { value: "premium_economy", label: "Premium economy" },
          { value: "business", label: "Business" },
        ],
      },
      { key: "comfort_upgrade_hours", label: "Comfort seat on flights of at least", type: "int", min: 0, max: 24, unit: "hours" },
      { key: "ground_transport", label: "Ground transport provided", type: "bool" },
    ],
    defaults: { air_class: "economy", comfort_upgrade_hours: 6, ground_transport: true },
  },
  {
    code: "baggage",
    section: "travel_stay",
    label: "Baggage",
    description: "Checked bags covered by the hiring entity.",
    required: false,
    defaultIncluded: true,
    removable: false,
    talentAddable: false,
    fields: [{ key: "checked_bags", label: "Checked bags", type: "int", min: 0, max: 6, unit: "bags" }],
    defaults: { checked_bags: 1 },
  },
  {
    code: "holding_day_room",
    section: "travel_stay",
    label: "Holding / day room",
    description: "A room before late departures or after early arrivals.",
    required: false,
    defaultIncluded: true,
    removable: true,
    talentAddable: true,
    fields: [
      {
        key: "commitment",
        label: "Commitment",
        type: "enum",
        options: [
          { value: "reasonable_efforts", label: "Reasonable efforts" },
          { value: "guaranteed", label: "Guaranteed" },
        ],
      },
    ],
    defaults: { commitment: "reasonable_efforts" },
  },
  {
    code: "meals",
    section: "travel_stay",
    label: "Meals",
    description: "Meal or meal break during rehearsals.",
    required: false,
    defaultIncluded: false,
    removable: true,
    talentAddable: true,
    fields: [{ key: "rehearsal_meal_provided", label: "Meal provided at rehearsals", type: "bool" }],
    defaults: { rehearsal_meal_provided: true },
  },
  {
    code: "insurance",
    section: "protection",
    label: "Insurance / liability",
    description: "Coverage while working.",
    required: false,
    defaultIncluded: true,
    removable: false,
    talentAddable: false,
    fields: [
      { key: "workers_comp", label: "Workers' compensation", type: "bool" },
      { key: "general_liability_additional_insured", label: "General liability, talent as additional insured", type: "bool" },
    ],
    defaults: { workers_comp: true, general_liability_additional_insured: true },
  },
  {
    code: "visa_passport",
    section: "protection",
    label: "Visa / passport",
    description: "Work papers for international dates.",
    required: false,
    defaultIncluded: true,
    removable: true,
    talentAddable: true,
    fields: [
      { key: "company_handles_paperwork", label: "Hiring entity handles paperwork", type: "bool" },
      { key: "company_pays_fees", label: "Hiring entity pays fees", type: "bool" },
    ],
    defaults: { company_handles_paperwork: true, company_pays_fees: true },
  },
  {
    code: "cancellation",
    section: "protection",
    label: "Cancellation",
    description: "Pay owed if the engagement is cancelled after booking.",
    required: false,
    defaultIncluded: true,
    removable: false,
    talentAddable: false,
    fields: [
      { key: "full_pay_weeks", label: "Weeks paid in full", type: "int", min: 0, max: 12, unit: "weeks" },
      { key: "half_pay_weeks", label: "Further weeks paid at 50%", type: "int", min: 0, max: 12, unit: "weeks" },
    ],
    defaults: { full_pay_weeks: 2, half_pay_weeks: 2 },
  },
  {
    code: "wardrobe_hmu",
    section: "protection",
    label: "Wardrobe / hair / make-up",
    description: "Wardrobe and a grooming stipend available to every dancer.",
    required: false,
    defaultIncluded: true,
    removable: false,
    talentAddable: false,
    fields: [
      { key: "wardrobe_provided", label: "Wardrobe provided", type: "bool" },
      { key: "hmu_provided", label: "Hair and make-up provided on show days", type: "bool" },
      { key: "grooming_stipend_cents", label: "Grooming stipend", type: "money", max: 1_000_000 },
    ],
    defaults: { wardrobe_provided: true, hmu_provided: true, grooming_stipend_cents: 0 },
  },
  {
    code: "physical_floors",
    section: "protection",
    label: "Physical / floors",
    description: "Safe surfaces and warm-up space.",
    required: false,
    defaultIncluded: true,
    removable: false,
    talentAddable: false,
    fields: [
      { key: "no_concrete", label: "No dancing on concrete", type: "bool" },
      { key: "warmup_space", label: "Warm-up space provided", type: "bool" },
    ],
    defaults: { no_concrete: true, warmup_space: true },
  },
  {
    code: "hazardous_work",
    section: "protection",
    label: "Hazardous work",
    description: "Disclose hazards up front. Undisclosed hazards may be refused.",
    required: false,
    defaultIncluded: true,
    removable: false,
    talentAddable: false,
    fields: [
      {
        key: "hazards",
        label: "Disclosed hazards",
        type: "multi",
        options: [
          { value: "water", label: "Water" },
          { value: "concrete", label: "Concrete" },
          { value: "pyro", label: "Pyrotechnics" },
          { value: "aerial", label: "Aerial / rigging" },
          { value: "heights", label: "Heights" },
        ],
      },
      { key: "bump_bps", label: "Hazard bump on rates", type: "bps", min: 0, max: 5000 },
    ],
    defaults: { hazards: [], bump_bps: 0 },
  },
  {
    code: "talent_release",
    section: "protection",
    label: "Talent release",
    description: "The artist or production has approved this talent before the offer is sent.",
    required: true,
    defaultIncluded: true,
    removable: false,
    talentAddable: false,
    fields: [
      { key: "release_required", label: "A release is required for this engagement", type: "bool" },
      { key: "release_approved", label: "The release is approved", type: "bool" },
    ],
    defaults: { release_required: true, release_approved: false },
  },
  {
    code: "governing_law",
    section: "legal",
    label: "Governing law / Exhibit A",
    description: "Motiion General Terms.",
    required: false,
    defaultIncluded: true,
    removable: false,
    talentAddable: false,
    placeholder: {
      version: EXHIBIT_A_PLACEHOLDER_VERSION,
      text: "Placeholder: Motiion counsel is preparing the General Terms (Exhibit A). This text is not final.",
    },
    fields: [],
    defaults: {},
  },
  {
    code: "warranty_hiring_entity",
    section: "legal",
    label: "Warranty / hiring entity",
    description: "Who engages and pays the talent.",
    required: false,
    defaultIncluded: true,
    removable: false,
    talentAddable: false,
    placeholder: {
      version: EOR_PLACEHOLDER_VERSION,
      text: "Placeholder: employer-of-record and warranty language is pending Motiion counsel review.",
    },
    fields: [{ key: "hiring_entity_name", label: "Hiring entity", type: "text", maxLength: 160 }],
    defaults: { hiring_entity_name: "" },
  },
  {
    code: "motiion_terms",
    section: "legal",
    label: "Motiion terms",
    description: "Booked through Motiion under Motiion's marketplace terms.",
    required: false,
    defaultIncluded: true,
    removable: false,
    talentAddable: false,
    placeholder: {
      version: EXHIBIT_A_PLACEHOLDER_VERSION,
      text: "Placeholder: Motiion marketplace terms pending counsel review. No agency non-circumvention clause applies.",
    },
    fields: [],
    defaults: {},
  },
];

export const TOUR_LIVE_DANCER_MODULES: readonly ModuleSpec[] = MODULES;
export const MODULE_CODES: readonly string[] = MODULES.map((m) => m.code);

// ---------------------------------------------------------------------------
// Additional agreement templates
// Field keys, choice keys, defaults, required flags, and limits match
// Motiion/Models/BookingDealMemoAdditionalTemplates.swift.
// Legal modules stay placeholders and are not approved counsel language.
// ---------------------------------------------------------------------------

const MONEY_MAX_CENTS = 50_000_000;

function moneyField(key: string, label: string): FieldSpec {
  return { key, label, type: "money", max: MONEY_MAX_CENTS };
}

function countField(key: string, label: string, unit: string): FieldSpec {
  return { key, label, type: "int", min: 0, max: 365, unit };
}

function choices(options: Array<[string, string]>): Option[] {
  return options.map(([value, label]) => ({ value, label }));
}

/** Swift `options.keys.sorted()` — lexicographic choice order and default. */
function sortedRoleOptions(options: Record<string, string>): Option[] {
  return Object.keys(options)
    .sort()
    .map((value) => ({ value, label: options[value] ?? value }));
}

function draftLegal(code: string, label: string, description: string): ModuleSpec {
  return {
    code,
    section: "legal",
    label,
    description,
    required: false,
    defaultIncluded: true,
    removable: false,
    talentAddable: false,
    placeholder: { version: DRAFT_LEGAL_VERSION, text: DRAFT_LEGAL_TEXT },
    fields: [],
    defaults: {},
  };
}

function roleModule(label: string, options: Record<string, string>): ModuleSpec {
  const roleOptions = sortedRoleOptions(options);
  return {
    code: "services_role",
    section: "role_credit",
    label,
    description: "The role covered by this agreement.",
    required: true,
    defaultIncluded: true,
    removable: false,
    talentAddable: false,
    fields: [
      { key: "role", label: "Role", type: "enum", options: roleOptions },
      { key: "role_title", label: "Role title", type: "text", maxLength: 80, required: true },
    ],
    defaults: { role: roleOptions[0]?.value ?? "", role_title: "" },
  };
}

function creditModule(): ModuleSpec {
  return {
    code: "billing_credit",
    section: "role_credit",
    label: "Credit",
    description: "How the person is credited.",
    required: false,
    defaultIncluded: true,
    removable: true,
    talentAddable: true,
    fields: [
      {
        key: "credit",
        label: "Credit",
        type: "enum",
        options: choices([
          ["program_listing", "Program or credits listing"],
          ["shared_card_end_titles", "Shared card"],
          ["none", "No separate credit"],
        ]),
      },
    ],
    defaults: { credit: "program_listing" },
  };
}

function datesModule(description: string, kinds: Array<[string, string]>): ModuleSpec {
  return {
    code: "work_dates",
    section: "dates",
    label: "Dates",
    description,
    required: true,
    defaultIncluded: true,
    removable: false,
    talentAddable: false,
    fields: [{ key: "blocks", label: "Date blocks", type: "date_blocks", kinds: choices(kinds), minItems: 0, maxItems: 24 }],
    defaults: { blocks: [] },
  };
}

function ratesModule(description: string, fields: FieldSpec[], defaults: Record<string, unknown>): ModuleSpec {
  return {
    code: "rates",
    section: "money",
    label: "Compensation",
    description,
    required: true,
    defaultIncluded: true,
    removable: false,
    talentAddable: false,
    fields,
    defaults,
  };
}

function usageModule(options: Array<[string, string]>, extra: FieldSpec[] = []): ModuleSpec {
  return {
    code: "usage_buyout",
    section: "usage_extras",
    label: "Usage",
    description: "How the performance may be recorded or distributed.",
    required: false,
    defaultIncluded: true,
    removable: false,
    talentAddable: false,
    fields: [
      { key: "usage", label: "Usage", type: "enum", options: choices(options) },
      moneyField("buyout_fee_cents", "Buyout fee"),
      ...extra,
    ],
    defaults: {
      usage: options[0]?.[0] ?? "",
      buyout_fee_cents: 0,
      territory: "",
      term: "",
    },
  };
}

function travelModule(): ModuleSpec {
  return {
    code: "travel",
    section: "travel_stay",
    label: "Travel",
    description: "Travel provided for the engagement.",
    required: false,
    defaultIncluded: false,
    removable: true,
    talentAddable: true,
    fields: [
      {
        key: "air_class",
        label: "Air travel",
        type: "enum",
        options: choices([
          ["economy", "Economy"],
          ["none", "No air travel"],
        ]),
      },
      { key: "ground_transport", label: "Ground transport provided", type: "bool" },
    ],
    defaults: { air_class: "economy", ground_transport: false, comfort_upgrade_hours: 0 },
  };
}

function wardrobeModule(): ModuleSpec {
  return {
    code: "wardrobe_hmu",
    section: "protection",
    label: "Wardrobe and grooming",
    description: "Wardrobe, hair, and make-up for the performance.",
    required: false,
    defaultIncluded: true,
    removable: false,
    talentAddable: false,
    fields: [
      { key: "wardrobe_provided", label: "Wardrobe provided", type: "bool" },
      { key: "hmu_provided", label: "Hair and make-up provided", type: "bool" },
    ],
    defaults: { wardrobe_provided: true, hmu_provided: true, grooming_stipend_cents: 0 },
  };
}

function safetyModule(): ModuleSpec {
  return {
    code: "physical_floors",
    section: "protection",
    label: "Safety",
    description: "Safe surfaces and disclosed hazards.",
    required: false,
    defaultIncluded: true,
    removable: false,
    talentAddable: false,
    fields: [
      { key: "no_concrete", label: "No dancing on concrete", type: "bool" },
      { key: "warmup_space", label: "Warm-up space provided", type: "bool" },
    ],
    defaults: { no_concrete: true, warmup_space: true },
  };
}

function cancellationModule(): ModuleSpec {
  return {
    code: "cancellation",
    section: "protection",
    label: "Cancellation",
    description: "Pay owed if the engagement is cancelled after agreement.",
    required: false,
    defaultIncluded: true,
    removable: false,
    talentAddable: false,
    fields: [countField("full_pay_weeks", "Weeks paid in full", "weeks")],
    defaults: { full_pay_weeks: 0, half_pay_weeks: 0 },
  };
}

function motiionTermsModule(): ModuleSpec {
  return draftLegal("motiion_terms", "Motiion terms", "Marketplace terms pending counsel review.");
}

const AWARD_SHOW_MODULES: readonly ModuleSpec[] = [
  roleModule("Award-show role", {
    featured_dancer: "Featured dancer",
    ensemble_dancer: "Ensemble dancer",
    presenter_support: "Presenter support",
  }),
  creditModule(),
  datesModule("Rehearsal and show dates.", [
    ["rehearsal", "Rehearsal"],
    ["show", "Show"],
  ]),
  ratesModule(
    "Guaranteed rehearsal and performance compensation.",
    [
      moneyField("rehearsal_day_rate_cents", "Rehearsal day rate"),
      countField("rehearsal_days", "Rehearsal days", "days"),
      moneyField("show_rate_cents", "Performance rate"),
      countField("show_count", "Performances", "shows"),
      moneyField("flat_fee_cents", "Flat amount, if used instead"),
    ],
    {
      rehearsal_day_rate_cents: 0,
      rehearsal_days: 0,
      show_rate_cents: 0,
      show_count: 0,
      flat_fee_cents: 0,
    },
  ),
  usageModule([
    ["live_only", "Live only"],
    ["live_plus_promo", "Live plus promotional clips"],
    ["broadcast_buyout", "Broadcast buyout"],
  ]),
  travelModule(),
  wardrobeModule(),
  safetyModule(),
  cancellationModule(),
  draftLegal("governing_law", "Governing terms", "Counsel-owned terms for this award show."),
  motiionTermsModule(),
];

const RESIDENCY_MODULES: readonly ModuleSpec[] = [
  roleModule("Residency role", {
    principal_dancer: "Principal dancer",
    ensemble_dancer: "Ensemble dancer",
    swing: "Swing",
  }),
  creditModule(),
  datesModule("Residency term, rehearsals, and performances.", [
    ["rehearsal", "Rehearsal"],
    ["performance", "Performance"],
    ["dark", "Dark or hold"],
  ]),
  ratesModule(
    "Weekly or per-performance guarantee.",
    [
      moneyField("week_rate_cents", "Weekly guarantee"),
      countField("work_weeks", "Guaranteed weeks", "weeks"),
      moneyField("show_rate_cents", "Performance rate"),
      countField("show_count", "Guaranteed performances", "shows"),
    ],
    {
      week_rate_cents: 0,
      work_weeks: 0,
      show_rate_cents: 0,
      show_count: 0,
    },
  ),
  {
    code: "additional_performances",
    section: "usage_extras",
    label: "Extension",
    description: "Optional extension after the initial term.",
    required: false,
    defaultIncluded: false,
    removable: true,
    talentAddable: true,
    fields: [moneyField("per_show_cents", "Rate during an extension")],
    defaults: { per_show_cents: 0 },
  },
  {
    code: "hotel",
    section: "travel_stay",
    label: "Housing",
    description: "Housing during the residency.",
    required: false,
    defaultIncluded: true,
    removable: false,
    talentAddable: false,
    fields: [
      {
        key: "room",
        label: "Housing",
        type: "enum",
        options: choices([
          ["single", "Private housing"],
          ["shared", "Shared housing"],
          ["stipend", "Housing stipend"],
        ]),
      },
    ],
    defaults: { room: "single" },
  },
  travelModule(),
  {
    code: "per_diem",
    section: "money",
    label: "Per diem",
    description: "Daily allowance paid by the hiring entity, not part of today's charge.",
    required: false,
    defaultIncluded: true,
    removable: true,
    talentAddable: true,
    fields: [moneyField("domestic_cents", "Per day")],
    defaults: { domestic_cents: 0 },
  },
  {
    code: "specialty_talent",
    section: "role_credit",
    label: "Understudy",
    description: "Understudy or swing coverage.",
    required: false,
    defaultIncluded: false,
    removable: true,
    talentAddable: true,
    fields: [moneyField("bump_cents", "Coverage bump")],
    defaults: { bump_cents: 0, skills: [] },
  },
  cancellationModule(),
  draftLegal("governing_law", "Governing terms", "Counsel-owned residency terms."),
  motiionTermsModule(),
];

const TELEVISION_FILM_MODULES: readonly ModuleSpec[] = [
  roleModule("Screen role", {
    principal_dancer: "Principal dancer",
    featured_dancer: "Featured dancer",
    ensemble_dancer: "Ensemble dancer",
  }),
  creditModule(),
  datesModule("Fittings, rehearsals, and shoot days.", [
    ["fitting", "Fitting"],
    ["rehearsal", "Rehearsal"],
    ["shoot", "Shoot"],
  ]),
  ratesModule(
    "Day, week, or shoot-day compensation.",
    [
      moneyField("day_rate_cents", "Day rate"),
      countField("work_days", "Work days", "days"),
      moneyField("week_rate_cents", "Weekly rate"),
      countField("work_weeks", "Work weeks", "weeks"),
      moneyField("shoot_day_rate_cents", "Shoot day rate"),
      countField("shoot_days", "Shoot days", "days"),
      moneyField("overtime_hourly_cents", "Overtime hourly rate"),
    ],
    {
      day_rate_cents: 0,
      work_days: 0,
      week_rate_cents: 0,
      work_weeks: 0,
      shoot_day_rate_cents: 0,
      shoot_days: 0,
      overtime_hourly_cents: 0,
    },
  ),
  usageModule(
    [
      ["production_only", "Production use only"],
      ["live_plus_promo", "Promotional use"],
      ["broadcast_buyout", "Media buyout"],
    ],
    [
      { key: "territory", label: "Territory", type: "text", maxLength: 120, required: false },
      { key: "term", label: "Term", type: "text", maxLength: 120, required: false },
    ],
  ),
  travelModule(),
  safetyModule(),
  cancellationModule(),
  draftLegal("governing_law", "Governing terms", "Counsel-owned screen terms, including residual treatment."),
  motiionTermsModule(),
];

const STANDARD_PERFORMANCE_MODULES: readonly ModuleSpec[] = [
  roleModule("Performance role", {
    featured_dancer: "Featured dancer",
    ensemble_dancer: "Ensemble dancer",
    swing: "Swing",
  }),
  datesModule("Rehearsal and performance dates.", [
    ["rehearsal", "Rehearsal"],
    ["performance", "Performance"],
  ]),
  ratesModule(
    "Flat or per-show compensation.",
    [
      moneyField("flat_fee_cents", "Flat amount"),
      moneyField("show_rate_cents", "Rate per show"),
      countField("show_count", "Shows", "shows"),
      moneyField("overtime_hourly_cents", "Overtime hourly rate"),
    ],
    {
      flat_fee_cents: 0,
      show_rate_cents: 0,
      show_count: 0,
      overtime_hourly_cents: 0,
    },
  ),
  {
    code: "holding_day_room",
    section: "dates",
    label: "Venue",
    description: "Where the work happens.",
    required: true,
    defaultIncluded: true,
    removable: false,
    talentAddable: false,
    fields: [{ key: "commitment", label: "Venue", type: "text", maxLength: 160, required: true }],
    defaults: { commitment: "" },
  },
  usageModule([
    ["live_only", "Live only"],
    ["live_plus_promo", "Live plus promotional recording"],
  ]),
  travelModule(),
  cancellationModule(),
  draftLegal("governing_law", "Governing terms", "Counsel-owned performance terms."),
  motiionTermsModule(),
];

const FLAT_SCOPE_MODULES: readonly ModuleSpec[] = [
  {
    code: "services_role",
    section: "role_credit",
    label: "Scope of work",
    description: "The work covered by the flat amount.",
    required: true,
    defaultIncluded: true,
    removable: false,
    talentAddable: false,
    fields: [{ key: "role_title", label: "Scope", type: "text", maxLength: 240, required: true }],
    defaults: { role_title: "" },
  },
  datesModule("Dates and location for the scope.", [["work", "Work"]]),
  ratesModule("One flat amount for the scope.", [moneyField("flat_fee_cents", "Flat amount")], { flat_fee_cents: 0 }),
  {
    code: "payment_terms",
    section: "money",
    label: "When it is due",
    description: "The flat amount is charged through Motiion after both sides sign.",
    required: true,
    defaultIncluded: true,
    removable: false,
    talentAddable: false,
    fields: [
      {
        key: "net_days",
        label: "Due",
        type: "enum",
        options: choices([
          ["on_signature", "When both sides sign"],
          ["7", "Within 7 days"],
          ["30", "Within 30 days"],
        ]),
      },
    ],
    defaults: { net_days: "on_signature" },
  },
  {
    code: "travel",
    section: "travel_stay",
    label: "Expenses",
    description: "Expenses covered in addition to the flat amount.",
    required: false,
    defaultIncluded: false,
    removable: true,
    talentAddable: true,
    fields: [{ key: "ground_transport", label: "Approved expenses are reimbursed", type: "bool" }],
    defaults: { ground_transport: false, air_class: "economy", comfort_upgrade_hours: 0 },
  },
  cancellationModule(),
  draftLegal("governing_law", "Governing terms", "Counsel-owned flat-compensation terms."),
  motiionTermsModule(),
];

const TEMPLATES: Record<BookingTemplateKey, readonly ModuleSpec[]> = {
  tour_live_dancer: MODULES,
  award_show: AWARD_SHOW_MODULES,
  residency: RESIDENCY_MODULES,
  television_film: TELEVISION_FILM_MODULES,
  standard_performance: STANDARD_PERFORMANCE_MODULES,
  flat_scope: FLAT_SCOPE_MODULES,
};

export function modulesForTemplate(templateKey: string | null | undefined = TOUR_LIVE_DANCER): readonly ModuleSpec[] {
  return isBookingTemplateKey(templateKey) ? TEMPLATES[templateKey] : MODULES;
}

export function getModuleSpec(code: string, templateKey: string | null | undefined = TOUR_LIVE_DANCER): ModuleSpec | null {
  return modulesForTemplate(templateKey).find((module) => module.code === code) ?? null;
}

export function isBookingTemplateKey(value: unknown): value is BookingTemplateKey {
  return typeof value === "string" && (BOOKING_TEMPLATE_KEYS as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Soft kind → template (MOT-93 abilities, never project_type)
// ---------------------------------------------------------------------------

export type SoftKindProject = {
  id?: string;
  enabled_modules?: Record<string, unknown> | null;
} | null;

export type SoftKindSnapshot = {
  source: "project_abilities" | "no_project";
  project_id: string | null;
  abilities: string[];
};

function softKindSnapshot(project: SoftKindProject): SoftKindSnapshot {
  if (!project) return { source: "no_project", project_id: null, abilities: [] };
  const modules = project.enabled_modules ?? {};
  return {
    source: "project_abilities",
    project_id: project.id ?? null,
    abilities: ["casting", "roster", "classes"].filter((key) => modules[key] === true),
  };
}

export function resolveBookingTemplate(input: {
  requestedKey?: string | null;
  project: SoftKindProject;
}):
  | { ok: true; templateKey: BookingTemplateKey; softKind: SoftKindSnapshot }
  | { ok: false; code: "TEMPLATE_UNSUPPORTED"; message: string } {
  if (input.requestedKey != null && input.requestedKey !== "" && !isBookingTemplateKey(input.requestedKey)) {
    return { ok: false, code: "TEMPLATE_UNSUPPORTED", message: "That agreement type is not available." };
  }
  // An explicit non-tour key is the caller's choice. Tour is still inferred from abilities.
  if (isBookingTemplateKey(input.requestedKey) && input.requestedKey !== TOUR_LIVE_DANCER) {
    return { ok: true, templateKey: input.requestedKey, softKind: softKindSnapshot(input.project) };
  }
  if (!input.project) {
    return {
      ok: true,
      templateKey: TOUR_LIVE_DANCER,
      softKind: { source: "no_project", project_id: null, abilities: [] },
    };
  }
  const softKind = softKindSnapshot(input.project);
  const tourShape = softKind.abilities.includes("casting") || softKind.abilities.includes("roster");
  if (!tourShape && softKind.abilities.includes("classes")) {
    return { ok: false, code: "TEMPLATE_UNSUPPORTED", message: "Tour deal memo only in v1." };
  }
  return { ok: true, templateKey: TOUR_LIVE_DANCER, softKind };
}

export function agreementCounselGate(legalStatus: string | null | undefined):
  | { ok: true }
  | { ok: false; code: "TEMPLATE_PENDING_COUNSEL"; message: string } {
  if (legalStatus === CONTRACT_LEGAL_EXISTING) return { ok: true };
  return {
    ok: false,
    code: "TEMPLATE_PENDING_COUNSEL",
    message: "This agreement is a draft for review. It is not approved legal language and cannot be sent until counsel approves it.",
  };
}

export type AvailabilityForMemo = {
  id: string;
  requester_id: string;
  talent_id: string;
  status: string;
  response_kind: string | null;
  project_id: string | null;
};

export type BookingForMemo = {
  id: string;
  industry_user_id: string;
  talent_user_id: string;
  project_id: string | null;
  availability_check_request_id: string | null;
  deal_memo_id: string | null;
};

const TERMINAL_AGREEMENT_STATUSES = ["declined", "cancelled", "expired"];

export function isOpenAgreementStatus(status: string | null | undefined): boolean {
  return !!status && !TERMINAL_AGREEMENT_STATUSES.includes(status);
}

/**
 * Create entry for one current agreement path.
 * Tour still requires a confirmed availability request. Other templates may start from a booking
 * with no availability request. An active executed-contract upload blocks a new memo: the upload
 * is a record only and is not itself a deal memo.
 */
export function decideDealMemoCreate(input: {
  requesterId: string;
  templateKey: BookingTemplateKey;
  legalStatus: string | null;
  availability: AvailabilityForMemo | null;
  booking: BookingForMemo | null;
  activeExecutedContract: boolean;
  openMemoId: string | null;
}):
  | { ok: false; code: BookingErrorCode; message: string; extra?: Record<string, unknown> }
  | {
      ok: true;
      templateKey: BookingTemplateKey;
      availabilityRequestId: string | null;
      bookingId: string | null;
      projectId: string | null;
      talentUserId: string;
      /** Set `bookings.deal_memo_id` to the new memo. Does not change booking status or payment. */
      linkBookingId: string | null;
    } {
  const counsel = agreementCounselGate(input.legalStatus);
  if (!counsel.ok) return counsel;
  const booking = input.booking;
  if (booking && booking.industry_user_id !== input.requesterId) {
    return { ok: false, code: "NOT_FOUND", message: "Booking not found." };
  }
  if (booking && input.activeExecutedContract) {
    return {
      ok: false,
      code: "EXECUTED_CONTRACT_EXISTS",
      message:
        "An uploaded contract is already on file for this booking. It is a record only, not a signature or a deal memo, and it does not change participation or payment.",
    };
  }
  if (input.openMemoId) {
    return {
      ok: false,
      code: "MEMO_EXISTS",
      message: input.booking
        ? "A deal memo is already open for this booking."
        : "A deal memo is already open for this availability request.",
      extra: { memoId: input.openMemoId },
    };
  }

  const availability = input.availability;
  const availabilityOk = !!availability &&
    availability.requester_id === input.requesterId &&
    isAvailabilityEligible(availability);
  if (availability && !availabilityOk) {
    return {
      ok: false,
      code: "AVAILABILITY_NOT_ELIGIBLE",
      message: "Booking starts from an availability request the talent confirmed.",
    };
  }
  if (booking && availabilityOk && availability && booking.talent_user_id !== availability.talent_id) {
    return { ok: false, code: "NOT_FOUND", message: "Booking not found." };
  }

  if (input.templateKey === TOUR_LIVE_DANCER) {
    if (!availabilityOk || !availability) {
      return {
        ok: false,
        code: "AVAILABILITY_NOT_ELIGIBLE",
        message: "Booking starts from an availability request the talent confirmed.",
      };
    }
    return {
      ok: true,
      templateKey: input.templateKey,
      availabilityRequestId: availability.id,
      bookingId: booking?.id ?? null,
      projectId: availability.project_id ?? booking?.project_id ?? null,
      talentUserId: availability.talent_id,
      linkBookingId: booking?.id ?? null,
    };
  }

  if (booking) {
    return {
      ok: true,
      templateKey: input.templateKey,
      availabilityRequestId: availabilityOk && availability ? availability.id : null,
      bookingId: booking.id,
      projectId: booking.project_id ?? availability?.project_id ?? null,
      talentUserId: booking.talent_user_id,
      linkBookingId: booking.id,
    };
  }
  if (availabilityOk && availability) {
    return {
      ok: true,
      templateKey: input.templateKey,
      availabilityRequestId: availability.id,
      bookingId: null,
      projectId: availability.project_id,
      talentUserId: availability.talent_id,
      linkBookingId: null,
    };
  }
  return {
    ok: false,
    code: "AVAILABILITY_NOT_ELIGIBLE",
    message: "This agreement starts from a booking.",
  };
}

export function isAvailabilityEligible(row: {
  status?: string | null;
  response_kind?: string | null;
} | null): boolean {
  if (!row) return false;
  return row.status === "submitted" &&
    (row.response_kind === "available" || row.response_kind === "available_with_conflict");
}

// ---------------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------------

export type ModuleValue = Record<string, unknown>;
export type FieldError = { moduleCode: string; field?: string; message: string };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function toInt(value: unknown): number | null {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n) || !Number.isInteger(n)) return null;
  return n;
}

/**
 * Coerce an untrusted module value to the template schema. Unknown keys are dropped.
 * Returns errors instead of silently clamping money or dates.
 */
export function normalizeModuleValue(
  spec: ModuleSpec,
  raw: unknown,
): { value: ModuleValue; errors: FieldError[] } {
  const input = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const value: ModuleValue = {};
  const errors: FieldError[] = [];
  const fail = (field: string, message: string) => errors.push({ moduleCode: spec.code, field, message });

  for (const field of spec.fields) {
    const incoming = field.key in input ? input[field.key] : spec.defaults[field.key];
    switch (field.type) {
      case "text": {
        const text = cleanText(incoming, field.maxLength);
        value[field.key] = text;
        break;
      }
      case "enum": {
        const str = typeof incoming === "number" ? String(incoming) : incoming;
        if (typeof str === "string" && field.options.some((o) => o.value === str)) value[field.key] = str;
        else fail(field.key, `${field.label}: choose an option.`);
        break;
      }
      case "multi": {
        const list = Array.isArray(incoming) ? incoming : [];
        const allowed = new Set(field.options.map((o) => o.value));
        const picked = [...new Set(list.filter((v): v is string => typeof v === "string"))];
        if (picked.some((v) => !allowed.has(v))) fail(field.key, `${field.label}: unknown option.`);
        value[field.key] = picked.filter((v) => allowed.has(v));
        break;
      }
      case "money": {
        const cents = toInt(incoming ?? 0);
        const max = field.max ?? BOOKING_MAX_CHARGE_CENTS;
        if (cents == null || cents < 0) fail(field.key, `${field.label}: enter an amount in dollars.`);
        else if (cents > max) fail(field.key, `${field.label}: amount is too large.`);
        value[field.key] = cents != null && cents >= 0 ? Math.min(cents, max) : 0;
        break;
      }
      case "int":
      case "bps": {
        const n = toInt(incoming ?? 0);
        if (n == null || n < field.min || n > field.max) {
          fail(field.key, `${field.label}: enter a number from ${field.min} to ${field.max}.`);
          value[field.key] = typeof spec.defaults[field.key] === "number" ? spec.defaults[field.key] : field.min;
        } else {
          value[field.key] = n;
        }
        break;
      }
      case "bool": {
        value[field.key] = incoming === true;
        break;
      }
      case "date_blocks": {
        const list = Array.isArray(incoming) ? incoming : [];
        if (list.length > field.maxItems) fail(field.key, `Up to ${field.maxItems} date blocks.`);
        const kinds = new Set(field.kinds.map((k) => k.value));
        const blocks: DateBlock[] = [];
        list.slice(0, field.maxItems).forEach((item, index) => {
          const block = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
          const kind = typeof block.kind === "string" && kinds.has(block.kind) ? block.kind : "";
          const start = typeof block.start_date === "string" ? block.start_date : "";
          const end = typeof block.end_date === "string" && block.end_date ? block.end_date : start;
          const location = cleanText(block.location, 120);
          if (!kind) fail(field.key, `Date block ${index + 1}: choose a type.`);
          if (!isValidIsoDate(start)) fail(field.key, `Date block ${index + 1}: choose a start date.`);
          else if (!isValidIsoDate(end) || end < start) fail(field.key, `Date block ${index + 1}: end date must be on or after the start date.`);
          blocks.push({ kind, start_date: start, end_date: end, location });
        });
        value[field.key] = blocks;
        break;
      }
    }
  }
  if (spec.placeholder) value.placeholder_version = spec.placeholder.version;
  return { value, errors };
}

export type ProvisionState = "pending" | "accepted" | "change_requested";
export type TalentFlag = "accept" | "remove" | "add" | "dispute";
export type IndustryReply = "accept_change" | "decline" | "counter";

/** Shape shared by the DB row (`booking_deal_memo_provisions`) and the negotiation helpers. */
export type ProvisionRecord = {
  module_code: string;
  section: SectionCode;
  sort_order: number;
  included: boolean;
  value: ModuleValue;
  previous_included: boolean | null;
  previous_value: ModuleValue | null;
  state: ProvisionState;
  talent_flag: TalentFlag | null;
  talent_proposed_value: ModuleValue | null;
  talent_note: string | null;
  industry_reply: IndustryReply | null;
  industry_decline_reason: DeclineReason | null;
  industry_note: string | null;
};

function blankProvision(spec: ModuleSpec, index: number): ProvisionRecord {
  return {
    module_code: spec.code,
    section: spec.section,
    sort_order: index,
    included: spec.defaultIncluded,
    value: normalizeModuleValue(spec, spec.defaults).value,
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

export function defaultProvisions(templateKey: string | null | undefined = TOUR_LIVE_DANCER): ProvisionRecord[] {
  return modulesForTemplate(templateKey).map((spec, index) => blankProvision(spec, index));
}

export type ComposeModuleInput = { moduleCode: string; included?: boolean; value?: unknown };

/**
 * Industry compose: merge submitted module values onto the template. Every template module is
 * returned (missing ones keep defaults) so the memo always has the full checklist.
 */
export function composeProvisions(
  modules: ComposeModuleInput[] | null | undefined,
  templateKey: string | null | undefined = TOUR_LIVE_DANCER,
): { provisions: ProvisionRecord[]; errors: FieldError[] } {
  const specs = modulesForTemplate(templateKey);
  const known = new Set(specs.map((spec) => spec.code));
  const byCode = new Map<string, ComposeModuleInput>();
  const errors: FieldError[] = [];
  for (const item of Array.isArray(modules) ? modules : []) {
    if (!item || typeof item.moduleCode !== "string") continue;
    if (!known.has(item.moduleCode)) {
      errors.push({ moduleCode: String(item.moduleCode), message: "Unknown module for this template." });
      continue;
    }
    byCode.set(item.moduleCode, item);
  }
  const provisions = specs.map((spec, index) => {
    const base = blankProvision(spec, index);
    const input = byCode.get(spec.code);
    if (!input) return base;
    const normalized = normalizeModuleValue(spec, input.value ?? spec.defaults);
    errors.push(...normalized.errors);
    const toggleable = spec.removable || spec.talentAddable;
    const included = spec.required || spec.placeholder || !toggleable
      ? spec.defaultIncluded || spec.required
      : input.included ?? spec.defaultIncluded;
    return { ...base, included: Boolean(included), value: normalized.value };
  });
  return { provisions, errors };
}

/** Server gate for Send (Design §2 rules): required modules, deal amount, release approval. */
export function validateForSend(
  provisions: ProvisionRecord[],
  templateKey: string | null | undefined = TOUR_LIVE_DANCER,
): {
  ok: boolean;
  code: "REQUIRED_MODULES_MISSING" | "RELEASE_NOT_APPROVED" | "INVALID_MODULE_VALUE" | null;
  errors: FieldError[];
} {
  const errors: FieldError[] = [];
  let code: "REQUIRED_MODULES_MISSING" | "RELEASE_NOT_APPROVED" | "INVALID_MODULE_VALUE" | null = null;
  const byCode = new Map(provisions.map((p) => [p.module_code, p]));
  const specs = modulesForTemplate(templateKey);

  for (const spec of specs) {
    const provision = byCode.get(spec.code);
    if (!provision) {
      if (spec.required) errors.push({ moduleCode: spec.code, message: `${spec.label} is required.` });
      continue;
    }
    if (!provision.included) {
      if (spec.required) errors.push({ moduleCode: spec.code, message: `${spec.label} is required.` });
      continue;
    }
    const normalized = normalizeModuleValue(spec, provision.value);
    if (normalized.errors.length) {
      errors.push(...normalized.errors);
      code = code ?? "INVALID_MODULE_VALUE";
    }
    for (const field of spec.fields) {
      if (field.type === "text" && field.required && !String(normalized.value[field.key] ?? "").trim()) {
        errors.push({ moduleCode: spec.code, field: field.key, message: `${field.label} is required.` });
      }
    }
  }

  if (specs.some((spec) => spec.code === "work_dates")) {
    const blocks = (byCode.get("work_dates")?.value.blocks as DateBlock[] | undefined) ?? [];
    if (!blocks.length) errors.push({ moduleCode: "work_dates", field: "blocks", message: "Add at least one date block." });
  }

  const deal = computeTalentDeal(provisions).talentDealCents;
  if (deal < BOOKING_MIN_DEAL_CENTS) {
    errors.push({ moduleCode: "rates", message: "Enter guaranteed rates so the deal is at least $1." });
  } else if (computeBookingFees(deal).chargeAmountCents > BOOKING_MAX_CHARGE_CENTS) {
    errors.push({ moduleCode: "rates", message: "The total charge is above the card limit." });
  }

  if (errors.length && !code) code = "REQUIRED_MODULES_MISSING";

  const releaseSpec = specs.find((spec) => spec.code === "talent_release");
  const release = releaseSpec ? byCode.get("talent_release")?.value : undefined;
  if (release && release.release_required === true && release.release_approved !== true) {
    errors.push({ moduleCode: "talent_release", field: "release_approved", message: "Talent release is not approved yet." });
    code = "RELEASE_NOT_APPROVED";
  }
  return { ok: errors.length === 0, code: errors.length ? code : null, errors };
}

// ---------------------------------------------------------------------------
// Money (PSE FINAL fee-on-top lock)
// ---------------------------------------------------------------------------

export type DealLine = { label: string; cents: number };

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/**
 * Talent deal = guaranteed compensation charged today. Overtime, per diem, stipends and
 * additional shows are paid under the memo's payment terms and are not in this amount.
 */
export function computeTalentDeal(provisions: ProvisionRecord[]): { talentDealCents: number; lines: DealLine[] } {
  const byCode = new Map(provisions.map((p) => [p.module_code, p]));
  const included = (code: string) => {
    const p = byCode.get(code);
    return p && p.included ? p.value : null;
  };
  const lines: DealLine[] = [];
  const rates = included("rates");
  const tourWeeks = num(rates?.tour_weeks);
  let rateBase = 0;
  if (rates) {
    const rehearsal = num(rates.rehearsal_day_rate_cents) * num(rates.rehearsal_days);
    const tour = num(rates.tour_weekly_rate_cents) * tourWeeks;
    rateBase = rehearsal + tour;
    if (rehearsal) lines.push({ label: `Rehearsal (${num(rates.rehearsal_days)} days)`, cents: rehearsal });
    if (tour) lines.push({ label: `Tour (${tourWeeks} weeks)`, cents: tour });
  }
  const hazard = included("hazardous_work");
  const hazardBps = num(hazard?.bump_bps);
  if (hazardBps && rateBase) lines.push({ label: "Hazard bump", cents: Math.round((rateBase * hazardBps) / 10_000) });
  const captain = included("dance_captain");
  if (captain && num(captain.bump_weekly_cents) && tourWeeks) {
    lines.push({ label: `Dance Captain (${tourWeeks} weeks)`, cents: num(captain.bump_weekly_cents) * tourWeeks });
  }
  const specialty = included("specialty_talent");
  if (specialty && num(specialty.bump_cents)) lines.push({ label: "Specialty bump", cents: num(specialty.bump_cents) });
  const usage = included("usage_buyout");
  if (usage && usage.usage === "broadcast_buyout" && num(usage.buyout_fee_cents)) {
    lines.push({ label: "TV / stream buyout", cents: num(usage.buyout_fee_cents) });
  }
  // Additional rate keys are charged only when that template's rates module actually stores them.
  // Overtime, per diem, and expense flags stay out of today's charge.
  if (rates && "flat_fee_cents" in rates && num(rates.flat_fee_cents)) {
    lines.push({ label: "Flat compensation", cents: num(rates.flat_fee_cents) });
  }
  if (rates && "show_count" in rates && "show_rate_cents" in rates && num(rates.show_count) && num(rates.show_rate_cents)) {
    const shows = num(rates.show_count);
    lines.push({ label: `Performances (${shows})`, cents: num(rates.show_rate_cents) * shows });
  }
  if (rates && "work_days" in rates && "day_rate_cents" in rates && num(rates.work_days) && num(rates.day_rate_cents)) {
    const days = num(rates.work_days);
    lines.push({ label: `Work days (${days})`, cents: num(rates.day_rate_cents) * days });
  }
  if (rates && "work_weeks" in rates && "week_rate_cents" in rates && num(rates.work_weeks) && num(rates.week_rate_cents)) {
    const weeks = num(rates.work_weeks);
    lines.push({ label: `Work weeks (${weeks})`, cents: num(rates.week_rate_cents) * weeks });
  }
  if (rates && "shoot_days" in rates && "shoot_day_rate_cents" in rates && num(rates.shoot_days) && num(rates.shoot_day_rate_cents)) {
    const days = num(rates.shoot_days);
    lines.push({ label: `Shoot days (${days})`, cents: num(rates.shoot_day_rate_cents) * days });
  }
  return { talentDealCents: lines.reduce((sum, line) => sum + line.cents, 0), lines };
}

export type BookingFees = {
  talentDealCents: number;
  platformFeeBps: number;
  platformFeeCents: number;
  /** Industry charge (PaymentIntent amount) = talent deal + Motiion fee. */
  chargeAmountCents: number;
  /** Destination transfer: Talent receives the full deal. */
  talentReceivesCents: number;
};

export function computeBookingFees(talentDealCents: number, platformFeeBps = BOOKING_PLATFORM_FEE_BPS): BookingFees {
  const deal = Math.max(0, Math.trunc(talentDealCents));
  const platformFeeCents = Math.round((deal * platformFeeBps) / 10_000);
  return {
    talentDealCents: deal,
    platformFeeBps,
    platformFeeCents,
    chargeAmountCents: deal + platformFeeCents,
    talentReceivesCents: deal,
  };
}

/** Stripe destination-charge params derived from the locked memo snapshot. */
export function destinationChargeParams(fees: BookingFees, destinationAccountId: string) {
  return {
    amount: fees.chargeAmountCents,
    currency: BOOKING_CURRENCY,
    application_fee_amount: fees.platformFeeCents,
    transfer_data: { destination: destinationAccountId },
  };
}

// ---------------------------------------------------------------------------
// Negotiation
// ---------------------------------------------------------------------------

export type TalentFlagInput = {
  moduleCode: string;
  flag: TalentFlag;
  proposedValue?: unknown;
  note?: string | null;
};

export function cleanNote(note: unknown): string | null {
  if (typeof note !== "string") return null;
  const trimmed = note.trim();
  return trimmed ? trimmed.slice(0, BOOKING_NOTE_MAX) : null;
}

function noteTooLong(note: unknown): boolean {
  return typeof note === "string" && note.trim().length > BOOKING_NOTE_MAX;
}

function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/**
 * Talent review: each flagged module becomes `change_requested`; every other module is accepted.
 * Requires at least one change — otherwise the talent should use Accept deal.
 */
export function applyTalentFlags(
  provisions: ProvisionRecord[],
  flags: TalentFlagInput[],
  templateKey: string | null | undefined = TOUR_LIVE_DANCER,
): { ok: true; provisions: ProvisionRecord[]; changed: number } | { ok: false; errors: FieldError[] } {
  const errors: FieldError[] = [];
  const byCode = new Map<string, TalentFlagInput>();
  for (const flag of Array.isArray(flags) ? flags : []) {
    if (!flag || typeof flag.moduleCode !== "string") continue;
    if (byCode.has(flag.moduleCode)) {
      errors.push({ moduleCode: flag.moduleCode, message: "One change per module." });
      continue;
    }
    byCode.set(flag.moduleCode, flag);
  }
  let changed = 0;
  const next = provisions.map((provision) => {
    const flag = byCode.get(provision.module_code);
    byCode.delete(provision.module_code);
    const accepted: ProvisionRecord = {
      ...provision,
      state: "accepted",
      talent_flag: "accept",
      talent_proposed_value: null,
      talent_note: null,
      previous_included: null,
      previous_value: null,
      industry_reply: null,
      industry_decline_reason: null,
      industry_note: null,
    };
    if (!flag || flag.flag === "accept") return accepted;
    const spec = getModuleSpec(provision.module_code, templateKey);
    if (!spec) {
      errors.push({ moduleCode: provision.module_code, message: "Unknown module." });
      return provision;
    }
    if (noteTooLong(flag.note)) {
      errors.push({ moduleCode: spec.code, message: `Notes are limited to ${BOOKING_NOTE_MAX} characters.` });
    }
    const base = { ...accepted, state: "change_requested" as const, talent_flag: flag.flag, talent_note: cleanNote(flag.note) };
    if (spec.placeholder) {
      errors.push({ moduleCode: spec.code, message: "Legal placeholders can't be changed." });
      return provision;
    }
    if (flag.flag === "remove") {
      if (!spec.removable || !provision.included) {
        errors.push({ moduleCode: spec.code, message: `${spec.label} can't be removed.` });
        return provision;
      }
      changed += 1;
      return { ...base, talent_proposed_value: null };
    }
    if (flag.flag === "add") {
      if (!spec.talentAddable || provision.included) {
        errors.push({ moduleCode: spec.code, message: `${spec.label} can't be added.` });
        return provision;
      }
      const normalized = normalizeModuleValue(spec, flag.proposedValue ?? spec.defaults);
      if (normalized.errors.length) {
        errors.push(...normalized.errors);
        return provision;
      }
      changed += 1;
      return { ...base, talent_proposed_value: normalized.value };
    }
    if (flag.flag === "dispute") {
      if (!provision.included || spec.fields.length === 0) {
        errors.push({ moduleCode: spec.code, message: `${spec.label} has no value to dispute.` });
        return provision;
      }
      const normalized = normalizeModuleValue(spec, flag.proposedValue);
      if (normalized.errors.length) {
        errors.push(...normalized.errors);
        return provision;
      }
      if (sameValue(normalized.value, provision.value)) {
        errors.push({ moduleCode: spec.code, message: "Change at least one value to dispute it." });
        return provision;
      }
      changed += 1;
      return { ...base, talent_proposed_value: normalized.value };
    }
    errors.push({ moduleCode: spec.code, message: "Unknown change type." });
    return provision;
  });
  for (const code of byCode.keys()) errors.push({ moduleCode: code, message: "Unknown module." });
  if (!errors.length && changed === 0) {
    errors.push({ moduleCode: "", message: "No changes requested. Use Accept deal instead." });
  }
  return errors.length ? { ok: false, errors } : { ok: true, provisions: next, changed };
}

export type IndustryReplyInput = {
  moduleCode: string;
  reply: IndustryReply;
  counterValue?: unknown;
  declineReason?: DeclineReason | null;
  note?: string | null;
};

/**
 * Industry answers every open flag. Replied modules return to the talent (`pending`) with a
 * before → after diff; the talent confirms with Accept deal or flags again.
 */
export function applyIndustryReplies(
  provisions: ProvisionRecord[],
  replies: IndustryReplyInput[],
  templateKey: string | null | undefined = TOUR_LIVE_DANCER,
): { ok: true; provisions: ProvisionRecord[] } | { ok: false; errors: FieldError[] } {
  const errors: FieldError[] = [];
  const byCode = new Map<string, IndustryReplyInput>();
  for (const reply of Array.isArray(replies) ? replies : []) {
    if (reply && typeof reply.moduleCode === "string") byCode.set(reply.moduleCode, reply);
  }
  const next = provisions.map((provision) => {
    const reply = byCode.get(provision.module_code);
    byCode.delete(provision.module_code);
    if (provision.state !== "change_requested") {
      if (reply) errors.push({ moduleCode: provision.module_code, message: "No change was requested here." });
      return provision;
    }
    const spec = getModuleSpec(provision.module_code, templateKey);
    if (!spec) return provision;
    if (!reply) {
      errors.push({ moduleCode: spec.code, message: `Respond to the change on ${spec.label}.` });
      return provision;
    }
    if (noteTooLong(reply.note)) {
      errors.push({ moduleCode: spec.code, message: `Notes are limited to ${BOOKING_NOTE_MAX} characters.` });
    }
    const replied: ProvisionRecord = {
      ...provision,
      state: "pending",
      previous_included: provision.included,
      previous_value: provision.value,
      industry_reply: reply.reply,
      industry_decline_reason: null,
      industry_note: cleanNote(reply.note),
    };
    if (reply.reply === "accept_change") {
      if (provision.talent_flag === "remove") return { ...replied, included: false };
      if (provision.talent_flag === "add") {
        return { ...replied, included: true, value: provision.talent_proposed_value ?? normalizeModuleValue(spec, spec.defaults).value };
      }
      return { ...replied, value: provision.talent_proposed_value ?? provision.value };
    }
    if (reply.reply === "decline") {
      const reason = DECLINE_REASONS.some((r) => r.value === reply.declineReason) ? reply.declineReason! : null;
      if (!reason) {
        errors.push({ moduleCode: spec.code, message: "Choose a reason for declining." });
        return provision;
      }
      if (reason === "other" && !cleanNote(reply.note)) {
        errors.push({ moduleCode: spec.code, message: "Add a short note when the reason is Other." });
        return provision;
      }
      return { ...replied, industry_decline_reason: reason };
    }
    if (reply.reply === "counter") {
      if (provision.talent_flag === "remove") {
        errors.push({ moduleCode: spec.code, message: "Accept or decline a removal request." });
        return provision;
      }
      const normalized = normalizeModuleValue(spec, reply.counterValue);
      if (normalized.errors.length) {
        errors.push(...normalized.errors);
        return provision;
      }
      return { ...replied, included: true, value: normalized.value };
    }
    errors.push({ moduleCode: spec.code, message: "Unknown reply." });
    return provision;
  });
  for (const code of byCode.keys()) errors.push({ moduleCode: code, message: "Unknown module." });
  return errors.length ? { ok: false, errors } : { ok: true, provisions: next };
}

/** Talent final acceptance locks every module as accepted. */
export function acceptAllProvisions(provisions: ProvisionRecord[]): ProvisionRecord[] {
  return provisions.map((p) => ({ ...p, state: "accepted", talent_flag: "accept", talent_proposed_value: null }));
}

export function openFlagCount(provisions: ProvisionRecord[]): number {
  return provisions.filter((p) => p.state === "change_requested").length;
}

export function readyExpiry(from: Date = new Date()): string {
  return new Date(from.getTime() + BOOKING_READY_EXPIRY_DAYS * 86_400_000).toISOString();
}

export function cleanSignature(value: unknown): string | null {
  const text = cleanText(value, BOOKING_SIGNATURE_MAX);
  return text.length >= 2 ? text : null;
}

// ---------------------------------------------------------------------------
// Status chips (Design §1 / §6)
// ---------------------------------------------------------------------------

export type StatusChip =
  | "Draft offer"
  | "Awaiting talent"
  | "Changes requested"
  | "Awaiting industry"
  | "Ready for payment"
  | "Paid / Booked"
  | "Declined"
  | "Expired"
  | "Canceled";

export function isMemoExpired(
  memo: { status: string; expires_at?: string | null; payment_state?: string | null },
  now = Date.now(),
): boolean {
  if (memo.payment_state === "processing" || memo.payment_state === "succeeded") return false;
  if (memo.status === "expired") return true;
  if (memo.status !== "payment_pending" || !memo.expires_at) return false;
  return new Date(memo.expires_at).getTime() <= now;
}

export function memoStatusChip(
  memo: { status: string; awaiting_party?: string | null; expires_at?: string | null },
  viewer: MemoParty,
  now = Date.now(),
): StatusChip {
  if (isMemoExpired(memo, now)) return "Expired";
  switch (memo.status) {
    case "draft":
      return "Draft offer";
    case "offered":
      return "Awaiting talent";
    case "negotiating":
      if (memo.awaiting_party === "industry") return viewer === "industry" ? "Changes requested" : "Awaiting industry";
      return "Awaiting talent";
    case "accepted":
    case "payment_pending":
      return "Ready for payment";
    case "paid":
      return "Paid / Booked";
    case "declined":
      return "Declined";
    case "cancelled":
      return "Canceled";
    default:
      return "Expired";
  }
}

export function formatCents(cents: number, currency = BOOKING_CURRENCY): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

export function formatBps(bps: number): string {
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 2)}%`;
}
