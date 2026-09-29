/**
 * MOT-94 booking deal memo template + negotiation rules.
 *
 * Pure TypeScript (no Deno / Node / npm imports) so the same file runs in Edge Functions,
 * the Next.js website (imported via `src/lib/booking/deal-memo.ts`) and `node --test` contract tests.
 * iOS mirrors these codes and field keys; change them only with a coordinated app release.
 */

export const BOOKING_DEAL_MEMO_PURPOSE = "booking_deal_memo";
export const TOUR_LIVE_DANCER = "tour_live_dancer";
export const BOOKING_TEMPLATE_KEYS = [TOUR_LIVE_DANCER] as const;
export type BookingTemplateKey = (typeof BOOKING_TEMPLATE_KEYS)[number];
export const BOOKING_TEMPLATE_VERSION = 1;

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
const MODULE_BY_CODE = new Map(MODULES.map((m) => [m.code, m]));

export function getModuleSpec(code: string): ModuleSpec | null {
  return MODULE_BY_CODE.get(code) ?? null;
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

export function resolveBookingTemplate(input: {
  requestedKey?: string | null;
  project: SoftKindProject;
}):
  | { ok: true; templateKey: BookingTemplateKey; softKind: SoftKindSnapshot }
  | { ok: false; code: "TEMPLATE_UNSUPPORTED"; message: string } {
  if (input.requestedKey != null && input.requestedKey !== "" && !isBookingTemplateKey(input.requestedKey)) {
    return { ok: false, code: "TEMPLATE_UNSUPPORTED", message: "Tour deal memo only in v1." };
  }
  if (!input.project) {
    return {
      ok: true,
      templateKey: TOUR_LIVE_DANCER,
      softKind: { source: "no_project", project_id: null, abilities: [] },
    };
  }
  const modules = input.project.enabled_modules ?? {};
  const abilities = ["casting", "roster", "classes"].filter((key) => modules[key] === true);
  const softKind: SoftKindSnapshot = {
    source: "project_abilities",
    project_id: input.project.id ?? null,
    abilities,
  };
  const tourShape = abilities.includes("casting") || abilities.includes("roster");
  if (!tourShape && abilities.includes("classes")) {
    return { ok: false, code: "TEMPLATE_UNSUPPORTED", message: "Tour deal memo only in v1." };
  }
  return { ok: true, templateKey: TOUR_LIVE_DANCER, softKind };
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

export function defaultProvisions(): ProvisionRecord[] {
  return MODULES.map((spec, index) => blankProvision(spec, index));
}

export type ComposeModuleInput = { moduleCode: string; included?: boolean; value?: unknown };

/**
 * Industry compose: merge submitted module values onto the template. Every template module is
 * returned (missing ones keep defaults) so the memo always has the full checklist.
 */
export function composeProvisions(
  modules: ComposeModuleInput[] | null | undefined,
): { provisions: ProvisionRecord[]; errors: FieldError[] } {
  const byCode = new Map<string, ComposeModuleInput>();
  const errors: FieldError[] = [];
  for (const item of Array.isArray(modules) ? modules : []) {
    if (!item || typeof item.moduleCode !== "string") continue;
    if (!MODULE_BY_CODE.has(item.moduleCode)) {
      errors.push({ moduleCode: String(item.moduleCode), message: "Unknown module for this template." });
      continue;
    }
    byCode.set(item.moduleCode, item);
  }
  const provisions = MODULES.map((spec, index) => {
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
export function validateForSend(provisions: ProvisionRecord[]): {
  ok: boolean;
  code: "REQUIRED_MODULES_MISSING" | "RELEASE_NOT_APPROVED" | "INVALID_MODULE_VALUE" | null;
  errors: FieldError[];
} {
  const errors: FieldError[] = [];
  let code: "REQUIRED_MODULES_MISSING" | "RELEASE_NOT_APPROVED" | "INVALID_MODULE_VALUE" | null = null;
  const byCode = new Map(provisions.map((p) => [p.module_code, p]));

  for (const spec of MODULES) {
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

  const blocks = (byCode.get("work_dates")?.value.blocks as DateBlock[] | undefined) ?? [];
  if (!blocks.length) errors.push({ moduleCode: "work_dates", field: "blocks", message: "Add at least one date block." });

  const deal = computeTalentDeal(provisions).talentDealCents;
  if (deal < BOOKING_MIN_DEAL_CENTS) {
    errors.push({ moduleCode: "rates", message: "Enter guaranteed rates so the deal is at least $1." });
  } else if (computeBookingFees(deal).chargeAmountCents > BOOKING_MAX_CHARGE_CENTS) {
    errors.push({ moduleCode: "rates", message: "The total charge is above the card limit." });
  }

  if (errors.length && !code) code = "REQUIRED_MODULES_MISSING";

  const release = byCode.get("talent_release")?.value;
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
    const spec = getModuleSpec(provision.module_code);
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
    const spec = getModuleSpec(provision.module_code);
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

export function isMemoExpired(memo: { status: string; expires_at?: string | null }, now = Date.now()): boolean {
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
