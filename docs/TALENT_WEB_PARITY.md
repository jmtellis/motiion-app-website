# Talent Web ↔ iOS Parity

Constraint document for Motiion Talent web translation. iOS is the canonical product reference. Last audited 2026-09-10.

## Confirmed decisions

| Topic | Decision |
|-------|----------|
| Credits | `profiles.experiences` JSONB is canonical. `talent_credits` + `industry_entities` remain a **derived search index** for Talent Navigator (prod: 641 credits / 1095 entities vs 35 profiles with experiences). |
| Tokens | Signed-in product surfaces adopt iOS language (Montserrat, `#00aacc`, iOS spacing/radii). Marketing stays Geist. |
| Navigator label | Tab label **"Navigator"** (matches iOS tab accessibility). Route stays `/discover`. Screen header may say **"Discover"** (matches iOS `IndustryFindTalentCopy.navigatorTitle`). |
| Scope | Phases 1–6 in progress. |

## Canonical iOS experience map

### Lane 1 — Create Account (gates app entry)

| Step | Entry | Required | Skip | Persist | Destination |
|------|-------|----------|------|---------|-------------|
| Account type + subtypes | First launch | ≥1 of dancer/choreographer/instructor | No | Draft local | Essentials |
| Essentials | After account type | Username, DOB ≥18, headshot, legal name (unless Apple/Google) | No | Draft + headshot upload on Continue | How did you hear |
| How did you hear | After essentials | Acquisition source | No | Draft (columns exist; iOS upsert currently omits them — web will write) | Account created |
| Account created | After acquisition | — | Secondary: "Not now" | `onboarding_completed_at` + auth `has_completed_onboarding` | Deferred wizard **or** Home + nudge |

**App entry gate:** auth metadata `has_completed_onboarding == true` (not profile completeness).

**Web signup:** Unified `/signup` → Lane 1 always starts at **“What brings you to Motiion?”** (talent subtypes when Talent is selected). Soft talent stub does not skip role.

### Lane 2 — Complete Profile (deferred, skippable)

Order (`TalentDeferredProfileSetup.deferredStepsOrdered`):

1. resumeImport (skip: "Add resume later")
2. profileIdentity
3. headshots
4. attributesMenu
5. talentSubtypes (legacy gap-fill)
6. sizing (skip: "Add sizing later")
7. workingLocations
8. representation (skip: "Add representation later")
9. unionStatus (skip: "Add union status later")
10. addStyles (skip: "Add genres later")
11. addSkills (skip: "Add skills later"; omitted for choreographer-only)
12. addCredits (skip: "Add credits later")
13. submitForReview (secondary: "Submit later")

Finish writes `profile_setup_completed_at`. Submit calls RPC `submit_profile_for_review`.

**Web shell:** `/profile/setup` uses signup split layout — left portrait (first headshot + name), right step form with iOS-style chips.

**Choreographer-only:** skip physical/sizing/skills when types are choreographer and not dancer/instructor.

### Post-entry surfaces (Talent shell)

| iOS tab (order) | Label | Web route (target) | Phase 4–5 status |
|-----------------|-------|--------------------|------------------|
| 0 Home | Home | `/home` | Deep-links to Chat Requests + Schedule |
| 1 Inbox | **Chat** | `/inbox` (label Chat) | Primary / General / Requests partitions |
| 2 Navigator | **Navigator** | `/discover` (label Navigator, header Discover) | Discover header + navigator search mode |
| 3 Events | **Schedule** | `/schedule` | Hub: Classes / Sessions / Events / Submissions |
| 4 Profile | **Portfolio** | `/portfolio` | Edit profile modal + Complete profile link |

Profile/settings overlay from Home avatar — not a tab.

### Completion signals (shared DB)

| Signal | Storage | Computed where |
|--------|---------|----------------|
| Lane 1 done | `profiles.onboarding_completed_at` + auth `has_completed_onboarding` | Client write |
| Lane 2 done | `profiles.profile_setup_completed_at` | Client write |
| Optional skip acks | **`profiles.deferred_setup_skipped` jsonb** (shared) | Client write |
| Review eligibility | RPC `profile_review_eligibility()` | DB (headshot ≥ 1) |
| Home checklist % | Client (`TalentHomeViewModel`) | Not a DB column |

## Parity matrix

| Experience | iOS Canonical | Current Web | Gap | Status |
|------------|---------------|-------------|-----|--------|
| Account type | Unified signup → role + subtypes | Unified `/signup` + role step | — | Done (Phases 1–3 + fix) |
| Lane 1 length | Short deferred model | role → account → profile → howDidYouHear → accountCreated | — | Done |
| Deferred setup | Full wizard + skips | `/profile/setup` split shell | Media polish | Done core |
| Home completion card | Start/Resume/Submit | `ProfileCompletionCard` | — | Done |
| Credits store | `profiles.experiences` | Experiences canonical + project to index | — | Done |
| Nav IA | 5 tabs | Chat / Navigator / Schedule labels | — | Done |
| Schedule | Events hub | Category hub + upcoming lists | Calendar overlay | Phase 4 core done |
| Chat | Primary/General/Requests | Partitions + pending requests | Actionable respond RPC | Phase 4 core done |
| Navigator | Discover / Find Talent | Discover header + navigator search | Full NL deck / talent favorites | Phase 4 partial |
| Portfolio edit | Edit Profile menu | Edit modal + setup link | Inline media/highlights editors | Phase 5 partial |
| Tokens | Montserrat / `#00aacc` | Product `--ds-*` | Remaining hex cleanup | Ongoing |

## Implementation order

1. ~~Phases 1–3~~ entry, tokens, shell, deferred setup, credits unfork
2. **Phase 4** Schedule hub, Chat partitions, Navigator Discover header, Home deep-links
3. **Phase 5** Portfolio Edit Profile (+ media via setup for now)
4. **Phase 6** QA / empty states / remaining hex / full NL Navigator

## Remaining Phase 6 checklist

- [ ] Full Talent NL Navigator deck (talent-shell wrapper around `TalentNavigatorPage`, no buyer Pro/invite)
- [ ] Chat `respond_to_request` actions in Requests partition
- [ ] Portfolio inline headshots / visuals / highlights editors
- [ ] Schedule calendar overlay
- [ ] Responsive + a11y pass across five tabs
- [ ] Cross-platform scenarios A–E against shared DB
