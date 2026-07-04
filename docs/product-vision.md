# Product Vision — Motiion

## 1. Vision & Mission

### Vision Statement

A professional dance industry that runs on one modern platform — where every dancer controls how they're seen and every hire happens on merit, not on who has whose number.

### Mission Statement

Motiion gives dancers a professional home for their careers and gives the people who hire them an end-to-end operating system to discover, organize, and book verified talent — replacing the spreadsheets, group texts, and PDFs the industry limps along on today.

### Founder's Why

Jay Tellis is a professional dancer in Los Angeles and a senior UX/UI designer by trade. He has lived the exact problem Motiion solves: talented dancers are overlooked, and the systems that decide who gets hired are informal, opaque, and stacked against the artist. Gigs move through Instagram DMs and group texts; a dancer's "portfolio" is a reel link and a screenshot resume; and no one — not the dancer, not the choreographer, not the casting director — has a single reliable source of truth.

Jay is building Motiion as a *creative-first advocate*, not an outsider optimizing a market. Because he's one of the people the platform serves, the product's north star is handing control back to the artist: the dancer decides how they're represented, what's visible, and who they connect with. That's the emotional core of the company, and it's the thing a competitor parachuting in from tech can't easily replicate.

His day job matters too. Designing software to medical-device standards means Jay brings a level of product rigor, accessibility discipline, and interface craft that the dance industry's current tools have never had. Motiion is where that precision meets a culture he's part of — and that combination of insider empathy and professional-grade execution is the founder-market fit.

### Core Values

- **The artist holds the pen.** Talent controls their own representation — what's shown, to whom, and how. Every feature decision is checked against whether it gives the creative more control or less. If it takes control away, it doesn't ship.
- **One source of truth, always.** Web and iOS share a single backend and data model. We never build a feature that creates a second, conflicting version of a profile, project, or message. Consistency across surfaces is a hard constraint, not a nice-to-have.
- **Feels like a tool, not a listing site.** We measure ourselves against Linear, Notion, Figma, and Raycast — speed, keyboard-first flows, and motion design — not against casting-call marketplaces. If an interaction feels like a job board, it's wrong.
- **Verified over voluminous.** A smaller database of real, verified professionals beats a huge database of noise. Trust in the talent data is the product's reputation. We protect it.
- **Ship the smallest thing that proves the loop.** The vision is an industry OS; the discipline is shipping the narrow slice that makes talent and industry both come back. Scope creep is the enemy that kills this company, not competitors.

### Strategic Pillars

- **Talent supply is the moat.** The verified dancer database is the asset every industry customer pays to reach. Grow and protect supply first; monetize the demand side.
- **Projects are the gravity.** For industry users, everything organizes around Projects. Any feature that doesn't connect back to a Project needs a very good reason to exist.
- **LA first, then replicate.** Win the Los Angeles dance market completely — density beats breadth. A second market only opens once LA is undeniably "where dance hiring happens."
- **Architect for the next vertical.** Build the data model and components so actors, models, musicians, and other creatives can be added later without a rewrite — but never let that future slow down the dance MVP.

### Success Looks Like

Twelve months in, Motiion is the default professional home for working dancers in Los Angeles. A few thousand verified dancers keep their profiles current because opportunities actually come through the platform. A hundred-plus industry accounts — casting directors, choreographers, agencies, and production teams — run real productions inside Motiion, organizing castings, rehearsals, and bookings around Projects instead of email. The marketplace take-rate is live on classes and events, a flagship LA dance event has marketed to exactly the dancers it wanted through a curated placement, and monthly recurring revenue is in the low five figures and climbing. Web and iOS run on one shared backend in production. When a choreographer in LA needs to cast a job, opening Motiion is the obvious first move — and dancers feel, for the first time, that the industry can find them on their own terms.

## 2. User Research

### Primary Persona

**Maya, 26 — professional commercial dancer, Los Angeles.** Maya trains daily, takes class at studios across the city, and auditions most weeks for commercials, tours, music videos, and live events. Her income is a patchwork of bookings she lands through relationships — a choreographer she's worked with texts a group thread, an agent forwards an email, a friend tags her in an Instagram post about an audition. She's highly skilled and deeply networked but perpetually one degree removed from the opportunities she can't see. Her "professional presence" is scattered: a Vimeo reel, an Instagram grid, a PDF resume that's three gigs out of date, and a headshot folder in her phone. She's fluent with apps and lives on her phone but works on a laptop when she's updating materials or applying to bigger jobs. Emotionally, she oscillates between confident (she knows she's good) and invisible (she knows decisions are being made in rooms she's not in). She'd switch to something new the moment it demonstrably put her in front of real opportunities *and* let her control how she shows up — not a job board that spams her, but a professional home that makes her legible to the people who hire.

### Secondary Personas

- **The Caster / Choreographer (demand side, primary payer).** A casting director or choreographer staffing commercials, tours, and live events. They currently keep talent in their head, their phone, and a spreadsheet. They need to find verified dancers fast, by specific criteria (style, look, location, availability, credits), and organize a production without losing threads across five apps. They pay for Motiion because it collapses that chaos into Projects.
- **The Agency.** A dance agency managing a roster. They need to represent their talent well, update profiles on their behalf, and coordinate bookings and submissions. They care about permissions and shared workspaces — multiple agents touching the same roster — and about their dancers looking professional to the industry.
- **The Event / Class Producer (marketplace + curated placements).** A studio, convention, or event organizer who wants to reach the exact dancers likely to attend. They're the buy-side of the curated-placement model and the supply of classes/events the marketplace take-rate runs on. They care about reaching a targeted, engaged dance audience — not buying generic ads.

### Jobs To Be Done

- **Functional (talent):** "When a job I'm right for exists, help me *see it and be seen for it* — without depending on who happens to text me." Keep my professional materials in one place that's always current.
- **Functional (industry):** "When I'm staffing a production, help me find verified dancers by exact criteria and run the whole thing — castings, invites, schedules, call sheets, messaging — in one connected place."
- **Emotional (talent):** "Make me feel like a professional whose career is mine to steer, not a hopeful waiting to be noticed."
- **Emotional (industry):** "Make me feel in command of a production instead of buried in threads and spreadsheets."
- **Social (talent):** "Let me present myself to the industry the way I'd want to be seen — polished, verified, on my terms."
- **Social (industry):** "Let me look organized and credible to my collaborators and clients when I run a job."

### Pain Points

1. **Opportunity invisibility (talent) — severe, constant.** Dancers can't see most of the jobs they're qualified for because distribution happens through private networks. Consequence: careers hinge on proximity, not merit. This is the emotional wound at the center of the company.
2. **Fragmented production management (industry) — severe, every project.** Running a job means juggling texts, emails, PDFs, spreadsheets, and calendars with no source of truth. Threads get lost, dancers get double-booked, information goes stale. High-frequency, high-stakes pain.
3. **No trustworthy talent database (industry) — severe, every search.** There's no verified, searchable, dance-native directory. People rebuild the same mental rolodex over and over. Existing casting sites are built for actors and don't model dance well.
4. **Stale, scattered professional identity (talent) — moderate to severe, ongoing.** Keeping reels, resumes, credits, and availability current across a dozen surfaces is nobody's favorite task, so it doesn't happen — which makes dancers look less professional than they are.
5. **No control over representation (talent) — moderate, chronic.** How a dancer is described, submitted, and remembered is largely out of their hands. Frustrating and demoralizing, if less acute than pure invisibility.

### Current Alternatives & Competitive Landscape

- **Instagram / TikTok DMs and group texts.** *Does well:* where dancers already are; fast, social, real relationships. *Falls short:* nothing is searchable, verifiable, or organized; opportunities evaporate in a scroll; no professional structure. *Switching cost:* low tooling cost but high behavioral inertia — this is the real competitor.
- **Casting Networks / Backstage and similar.** *Does well:* established, have industry mindshare, handle submissions. *Falls short:* built for actors, not dance; feel like job boards; don't model dance-specific attributes, skills, or production workflows; give talent little control. *Switching cost:* moderate for industry users with existing accounts.
- **Spreadsheets, email, PDFs, and agency rolodexes.** *Does well:* infinitely flexible, free, familiar. *Falls short:* no source of truth, no discovery, no verification, no collaboration; every production rebuilds from scratch. *Switching cost:* low — but replacing "the way we've always done it" requires the new tool to be clearly better.
- **"Do nothing" / status quo.** The most common alternative. The industry has functioned this way for decades; the burden of proof is on Motiion to show the switch is worth it.

### Key Assumptions to Validate

- **We assume dancers will keep profiles current if real opportunities flow through Motiion.** Profile decay killed many talent platforms. *To validate:* track profile completeness and update frequency against opportunity volume in the LA beta; if opportunities lag, supply engagement will too.
- **We assume industry users will run *whole productions* in Motiion, not just search.** The Projects bet depends on this. *To validate:* measure whether beta industry accounts create Projects and invite talent, or just browse and export contacts elsewhere.
- **We assume a verified, dance-native database is worth paying for.** *To validate:* get industry users to a paid tier during the beta; willingness to pay is the signal, not enthusiasm.
- **We assume the two-sided cold-start can be seeded LA-first through Jay's network.** *To validate:* can we reach ~1,000 credible LA dancers and 75 industry accounts through community + partnerships without paid acquisition?
- **We assume the marketplace take-rate on classes/events is acceptable to producers.** *To validate:* run at least one real class/event transaction through the platform and confirm the producer accepts the cut for the reach.
- **We assume curated placements are seen as valuable access, not "ads."** *To validate:* land one flagship LA event as a paying placement and measure dancer engagement + producer satisfaction.
- **We assume web + iOS on one backend won't slow the MVP.** *To validate:* confirm the shared data model serves both surfaces without per-platform forks in the beta.
- **We assume verification can be operationally lightweight at LA scale.** *To validate:* define and run the verification process for the first few hundred dancers and measure time-per-profile.

### User Journey Map

**Awareness:** Maya hears about Motiion from a choreographer she trusts or sees it at a class/audition where Jay's community-first seeding is active. Emotion: curious but skeptical — she's seen "the app that'll fix dance" before.

**Consideration:** She looks at a few dancer profiles already on the platform and sees they look genuinely professional and verified. Emotion: intrigued; this feels like a tool, not a listing site.

**First use:** She builds her profile on desktop (or continues from iOS) — media, credits, attributes, skills, availability. The flow is fast and feels premium. Friction risk: profile setup is real work; the payoff must be immediate.

**Magic moment:** On finishing her profile, Motiion instantly surfaces live castings and opportunities matched to her skills, look, and availability. Emotion: *the industry suddenly feels reachable.* This is the moment she tells another dancer.

**Habit formation:** Opportunities and messages keep arriving; she updates availability before big audition seasons; she checks Motiion the way she checks Instagram. On the industry side, a choreographer who found her in a search invites her into a Project — she RSVPs, and the schedule, call sheet, and thread all live in one place. Emotion: relief and belonging.

**Advocacy:** Maya books work she wouldn't have seen otherwise and credits Motiion. She brings other dancers on; a choreographer she worked with signs up their whole team. The flywheel turns.

## 3. Product Strategy

### Product Principles

- **Control-first.** Every talent-facing feature must increase the artist's control over their representation. Visibility, disclosure, and connection are the dancer's choices.
- **Everything hangs off a Project (for industry).** Castings, events, rehearsals, fittings, call sheets, docs, and messages are children of a Project. No orphaned workflows.
- **One data model, two surfaces.** Web and iOS are views onto the same backend. Never fork the model to ship a surface-specific feature.
- **Speed and motion are features.** Sub-second search, keyboard shortcuts, and considered motion design are part of the value, not decoration. Latency is a bug.
- **Verified by default.** Talent data carries a verification signal. The database's credibility is the moat; guard it in every flow.
- **Design for the next vertical, build for dance.** Keep entities generic enough to extend to other creative fields later, but resist building for those fields now.

### Market Differentiation

Motiion's differentiation is a category claim: it is *professional creative software for the dance industry*, not a casting marketplace. The incumbents (Casting Networks, Backstage) are actor-first job boards; the real-world default (Instagram, texts, spreadsheets) is unstructured and invisible. Neither models dance specifically, neither gives talent control, and neither turns a production into an organized, collaborative object. Motiion does all three: a dance-native, verified talent database; a Projects-based operating system for the people who hire; and a control-first stance that makes talent *want* to keep their data current. This matters to the user because it changes outcomes — dancers get seen on merit, industry users run productions without the thread-chaos — and it's defensible because the moat is verified LA talent supply plus the switching cost of running live productions inside the platform. The brand posture (Linear/Notion/Figma-caliber craft in an industry that's never had it) compounds the advantage: it signals seriousness to professionals who are tired of amateur tools.

### Magic Moment Design

**The moment (talent):** finishing a profile and instantly seeing live castings and opportunities matched to skills, look, and availability. **The moment (industry):** typing a plain-language query and getting a verified, bookable roster in seconds, then dragging it into a Project.

For the talent moment to fire reliably, three things must be true in the MVP: (1) there must be *real opportunities in the system* at the moment a dancer completes onboarding — so the industry side and at least seed castings must exist before talent onboards at scale; (2) matching must be good enough on day one using structured attributes (style, location, availability, skills) even before advanced AI ranking; (3) profile completion must be fast enough that dancers reach the payoff in one sitting. The shortest path from sign-up to magic moment is: authenticate → guided profile build (media, attributes, skills, availability) → matched-opportunities view. If seed opportunity supply is thin at launch, the moment falls flat — so seeding castings/opportunities in the LA beta is a launch-blocking dependency, not a nice-to-have.

For the industry moment, the shortest path is: authenticate → search (structured filters first, natural-language layered on) → results → save to roster or drag into a Project. This is achievable in the MVP with structured search; AI/semantic search enhances it but isn't required for the first version of the moment.

### MVP Definition — In Scope

- **Auth + accounts with user types (talent vs. industry).** *Why:* everything gates on knowing who the user is. *Done:* a user can sign up, verify email, and land in the correct experience for their type on web (shared backend with iOS).
- **Talent profile system.** Media upload/organization, resume/credits, representation, physical attributes, skills, availability, location, social links. *Why:* the profile *is* the supply-side product and the input to the magic moment. *Done:* a dancer can build a complete, verified-eligible profile on desktop in one sitting.
- **Verified talent database + structured search.** Advanced filters (style, location, availability, attributes, skills, credits) with fast results. *Why:* the core asset industry users pay to reach; powers the industry magic moment. *Done:* an industry user can search and get relevant, verified results in under a couple seconds.
- **Rosters / Talent Lists.** Save talent into named lists. *Why:* the bridge from search to action and into Projects. *Done:* an industry user can save dancers to a roster and reuse it.
- **Projects (core object) with Castings.** Create a Project; create a Casting within it; invite talent from search/rosters. *Why:* Projects are the gravity of the industry side and the container the magic moment drags into. *Done:* an industry user can create a Project, post a Casting, and invite dancers who receive it.
- **Opportunity matching for talent.** On profile completion, surface live castings/opportunities matched by structured attributes. *Why:* this is the talent magic moment. *Done:* a newly completed profile shows a relevant, non-empty matched-opportunities view (given seeded supply).
- **Invitations + RSVP + activity.** Talent receive invitations to castings/auditions/events and can respond; responses update the Project. *Why:* closes the loop between the two sides. *Done:* an invited dancer can RSVP and the industry user sees the status on the Project.
- **Messaging (project-scoped).** Threads connected to a Project/Casting. *Why:* replaces the text/email scramble; keeps communication in the source of truth. *Done:* the two sides can message within a Project context.
- **Notifications.** Real-time notification of invitations, messages, and matches. *Why:* drives the habit loop. *Done:* users are notified in-app (and via email for key events) of relevant activity.

### Explicitly Out of Scope

- **Full marketplace payments / take-rate on classes & events.** *Tempting because:* it's a revenue line and part of the model. *Deferred because:* it requires payments plumbing, producer onboarding, and transaction volume that don't exist at MVP. *Reconsider:* once the beta has active industry accounts and at least one class/event partner ready to transact (target: 6-month window).
- **Curated paid placements / ad system.** *Tempting because:* it's differentiated and monetizable. *Deferred because:* it needs an engaged dancer audience to be worth buying. *Reconsider:* after LA supply is dense enough to sell targeted reach.
- **AI/semantic search, NL filtering, AI recommendations & profile optimization.** *Tempting because:* it's a headline capability. *Deferred because:* structured search delivers the magic moment now; AI is an enhancement layer. *Reconsider:* immediately after core loop is proven, as the first post-MVP investment.
- **Multi-org permission depth, agency roster management on behalf of talent, team workspaces.** *Tempting because:* agencies are a key persona. *Deferred because:* full permission modeling is heavy; MVP can support single industry accounts + basic Projects. *Reconsider:* once individual industry usage validates Projects.
- **Additional creative verticals (actors, models, musicians, athletes, creators).** *Tempting because:* it's the long-term vision. *Deferred because:* focus wins the beachhead. *Reconsider:* only after LA dance is undeniably won. (Architect the data model to allow it; don't build it.)
- **Advanced production tooling (travel, fittings logistics, call-sheet generation, documents).** *Tempting because:* it deepens the Projects value. *Deferred because:* MVP needs the core Project + Casting + invite loop first. *Reconsider:* as fast-follow once industry users live in Projects.

### Feature Priority (MoSCoW)

- **Must Have:** Auth + user types; talent profiles (media, credits, attributes, skills, availability); verified database + structured search; rosters; Projects + Castings; opportunity matching for talent; invitations + RSVP; project-scoped messaging; notifications; shared backend serving web + iOS.
- **Should Have:** Basic agency/team support; saved searches; curated collections; richer Project sub-objects (events, rehearsals); email notifications for all key events; basic verification workflow tooling.
- **Could Have:** AI/semantic search, NL filtering, AI recommendations, profile optimization, scheduling suggestions; call sheets, fittings, travel, documents; analytics dashboards for users.
- **Won't Have (this time):** Marketplace payments/take-rate; curated ad system; additional creative verticals; deep multi-org permission hierarchies; workflow automation.

### Core User Flows

1. **Talent onboarding → magic moment.** *Trigger:* dancer signs up (or continues from iOS). *Steps:* choose talent type → guided profile build (media, attributes, skills, availability, credits) → submit for verification eligibility → land on matched-opportunities view. *Outcome:* dancer sees live, relevant castings. *Success:* completed profile shows a non-empty matched view; dancer applies to or saves at least one opportunity.
2. **Industry search → roster → Project.** *Trigger:* caster needs to staff a job. *Steps:* search with structured filters → review verified results → save dancers to a roster → create a Project → create a Casting → invite roster/dancers. *Outcome:* invitations sent from within a Project. *Success:* Project created with a Casting and ≥1 invited dancer in under a few minutes.
3. **Invitation → RSVP → connected communication.** *Trigger:* dancer receives an invitation. *Steps:* notification → view Casting details → RSVP → message within the Project thread. *Outcome:* status and conversation live on the Project. *Success:* industry user sees RSVP status update and can message the dancer in-context.

### Success Metrics

- **Primary metric (North Star):** number of *opportunity connections made* — invitations sent to matched talent that receive a response — per week. This single number captures both sides working (supply is discoverable, demand is acting, the loop closes).
- **Secondary metrics:** verified talent profiles (completeness ≥ threshold); active industry accounts creating Projects; Projects with ≥1 Casting and ≥1 invited dancer; paying industry subscriptions; profile update frequency; time-to-magic-moment for new talent.
- **Leading indicators:** onboarding completion rate; search-to-roster conversion; roster-to-invite conversion; invitation response rate; week-1 talent return rate.
- **Thresholds — 90 days:** *Good:* 1,000 talent profiles, 75 industry accounts, first paying subscriptions. *Great:* those plus a flagship LA event marketed via a curated placement and a live class/event transaction.
- **Thresholds — 6 months:** *Good:* ~2,500 talent, 150 industry orgs, ~$15k MRR. *Great:* marketplace take-rate live and a credible case to open a second market.

### Risks

- **Two-sided cold-start (high likelihood, high impact).** Talent won't stay without opportunities; industry won't pay without talent. *Mitigation:* seed the demand side and a set of real castings *before* onboarding talent at scale; go LA-only for density; use Jay's network and partnerships to bootstrap both sides in parallel.
- **Profile decay (high likelihood, high impact).** If opportunities don't flow, dancers stop updating and the database rots. *Mitigation:* make the magic moment real at launch (seeded supply); prompt updates around audition seasons; tie visibility to freshness.
- **Scope creep (high likelihood, high impact).** The vision is an entire industry OS; trying to build it all sinks the MVP. *Mitigation:* enforce the MoSCoW list; treat AI, marketplace, ads, and multi-vertical as explicitly out of scope for v1.
- **Behavioral inertia vs. Instagram/texts (medium–high likelihood, high impact).** The status quo is free and familiar. *Mitigation:* be dramatically better at the one job (getting seen / running a production), not marginally better at everything.
- **Verification operational load (medium likelihood, medium impact).** Manual verification may not scale. *Mitigation:* keep it lightweight at LA scale; measure time-per-profile; automate later.
- **Monetization timing (medium likelihood, medium impact).** Charging too early kills supply; too late starves the business. *Mitigation:* keep talent free; validate industry willingness-to-pay in the beta before scaling.
- **Solo-founder bandwidth (medium likelihood, high impact).** One design-led founder building with AI agents around a full-time job. *Mitigation:* ruthless prioritization, phased roadmap, lean on managed services (Supabase, Stripe, Resend) and AI coding to compress build time.
- **Platform parity drift (medium likelihood, medium impact).** Web and iOS diverging. *Mitigation:* one backend, one data model, shared design system; treat forks as defects.

## 4. Brand Strategy

### Positioning Statement

For professional dancers and the people who hire them who are tired of running careers and productions through DMs, spreadsheets, and actor-centric job boards, Motiion is the operating system for the professional dance industry that lets talent control how they're represented and lets industry pros discover, organize, and book verified dancers in one place. Unlike Casting Networks, Backstage, and the Instagram/spreadsheet status quo, Motiion is dance-native professional software — built like Linear or Figma, not like a listing site — where the artist holds the pen.

### Brand Personality

Motiion is a **confident creative insider**: someone who's actually been in the room. If Motiion were a person, they'd be a working choreographer-slash-designer who talks like a dancer, not a recruiter — direct, culturally fluent, unimpressed by hype. They'd wear all black and good shoes, know the difference between a convention and a callback, and never, ever talk down to talent. They're premium but human: they respect your time, say things plainly, and let the work speak. They wouldn't use corporate filler ("leverage synergies"), wouldn't hype ("revolutionary!!!"), and wouldn't condescend. They'd rather show you than tell you.

### Voice & Tone Guide

**Voice (constant):** direct, premium, culturally fluent, human. Short confident sentences. No jargon, no hype, no fluff. Speaks *dancer*.

Tone shifts by context, but the voice never does. DO / DON'T by context:

| Context | DO | DON'T |
|---|---|---|
| Onboarding | "Let's build your profile. This is how the industry finds you." | "Welcome to your journey! We're so excited to have you aboard! 🎉" |
| Error states | "That didn't save. Try again." | "Oops! Something went wrong on our end, so sorry about that!" |
| Empty states | "No opportunities yet. Finish your profile and we'll start matching." | "It's a little empty in here..." |
| Success messages | "You're live. Casting directors can find you now." | "Congratulations!!! You did it!!!" |
| Marketing copy | "The industry runs on who you know. Motiion runs on what you can do." | "The #1 revolutionary AI-powered platform disrupting dance!" |

### Messaging Framework

- **Tagline:** *The operating system for the dance industry.*
- **Homepage headline:** *Get seen for the work you can actually do.* (talent-facing) / *Find, organize, and book verified dancers — in one place.* (industry-facing, audience-toggled)
- **Value propositions:**
  1. **For talent —** "Your career, on your terms. One professional home for your reel, credits, and availability — and real opportunities that come to you."
  2. **For industry —** "Every production, organized. Search verified dancers, build rosters, and run castings, schedules, and messages around a single Project."
  3. **For the industry at large —** "The verified source of truth for professional dance — replacing the spreadsheets, texts, and PDFs the whole business runs on."
- **Feature descriptions:** written as outcomes, not features. "Structured search" → "Find the exact dancer — by style, look, availability, and credits — in seconds." "Projects" → "Everything for a job in one place: casting, schedule, call sheet, messages, talent."
- **Objection handlers:**
  - *"I already use Instagram."* → "Instagram shows the world your highlights. Motiion shows the industry you're bookable — and tells you when there's a job."
  - *"Casting sites already exist."* → "For actors. Motiion is built for dance — the attributes, the workflows, and the control are ours."
  - *"Is my data mine?"* → "You control what's shown and to whom. The artist holds the pen. Always."

### Elevator Pitches

- **5-second:** "Motiion is the operating system for the professional dance industry."
- **30-second:** "Dance runs on group texts, spreadsheets, and Instagram DMs — dancers get overlooked and the people hiring them have no real way to find verified talent. Motiion is one platform where dancers manage their careers and control how they're represented, and where casting directors, choreographers, and agencies discover, organize, and book them. Web and iOS, one source of truth, built like Linear — not like a job board."
- **2-minute:** "I'm a professional dancer in LA and a product designer. The dance industry is enormous and completely underserved by software. Every job moves through private networks — DMs, group texts, a choreographer's phone — so talented dancers stay invisible and the people hiring them rebuild the same rolodex from scratch every time. The tools that exist, like Casting Networks and Backstage, are built for actors and treat everyone like a listing. Motiion is the operating system for the dance industry. For talent, it's a professional home: your media, credits, attributes, and availability in one place, and real opportunities matched to you the moment your profile's done — with you in control of how you're represented. For the people who hire, it's an end-to-end system built around Projects: search a verified, dance-native database, save rosters, run castings, invite talent, and keep every schedule, call sheet, and message connected to the job. Web and iOS share one backend, so it's a single source of truth. We're starting with dancers in Los Angeles because density wins, and the architecture extends to actors, models, and other creatives later. The reason this works is that I'm not an outsider optimizing a market — I'm one of the people it's for, and I build software to professional standards. We're seeding LA now through the community and event partnerships, monetizing the industry side with subscriptions plus a marketplace on classes and events. I'm looking for [early users / partners / capital] to help make Motiion the place the dance industry runs on."

### Competitive Differentiation Narrative

The dance industry is a large, high-frequency market running almost entirely on consumer tools and paper. The nominal competitors — Casting Networks and Backstage — were built for actors and treat talent as rows in a listing; they don't model dance-specific attributes, don't organize productions, and give the artist no control. The real competitor is the status quo: Instagram, group texts, and spreadsheets, which are free and familiar but leave dancers invisible and producers drowning in threads. Motiion wins by being categorically different, not incrementally better. It's dance-native and verified, so the talent data is trustworthy. It's organized around Projects, so hiring is a managed workflow rather than a scramble. It's control-first, so dancers actually keep it current — which makes the database better, which makes it more valuable to the people who pay. And it's built with the craft of Linear or Figma, signaling to professionals that this is finally a serious tool for a serious industry. The defensibility compounds: verified LA supply is hard to replicate, running live productions inside Motiion creates switching costs, and the single shared backend across web and iOS means the experience is consistent everywhere the industry already works. Start with LA dance, win it completely, then extend the same operating system to the rest of the creative economy.

## 5. Visual Design

Visual design tokens (colors, typography, spacing, components, motion) live in `docs/design.md`. If that file does not yet exist, run the Design System skill with image references to generate it before building.
