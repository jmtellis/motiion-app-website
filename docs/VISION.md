# Vision — Motiion

> Captured by the Product Planner skill. This file is the source of truth for
> generating product-vision.md, prd.md, and product-roadmap.md. Edit it directly
> and re-run the Product Planner to regenerate downstream documents.

**Created:** 2026-07-03
**Updated:** 2026-07-03

## Founder

- **Name:** Jay Tellis (goes by Jay)
- **Expertise:** Senior UX/UI designer at a medical device company; professional dancer in Los Angeles
- **Background:** As a working professional dancer in LA, Jay saw firsthand how overlooked dancers are and how much of the industry runs on scattered, informal tools. He's building Motiion as the foundation for dancers — and eventually all creative artists — to sustain their careers: better opportunities, more meaningful connections, and real control over how they're represented. His day job designing software to medical-device standards gives him the product and UX rigor to build it well.

## Purpose

- **Who you help:** Two groups — (1) professional talent: dancers and choreographers; and (2) industry professionals who hire dance talent: casting directors, creative directors, producers, talent agencies, brands, labels, event organizers, and production companies.
- **Problem you solve:** The professional dance industry runs on fragmented, disconnected tools — spreadsheets, email, group texts, PDF resumes and reels, social media DMs, and actor-centric casting sites. Dancers are overlooked and have no control over how they're represented, and industry pros have no efficient, trustworthy way to discover, organize, and hire verified dance talent.
- **Desired transformation:** Every workflow that today happens across spreadsheets, email, text, PDFs, social media, and disconnected casting tools is unified into one modern platform — an operating system for the professional dance industry where talent manages their careers and industry pros discover, hire, organize, and collaborate with that talent.
- **Why you:** Creative-first advocate. As a dancer, Jay has felt what it's like to have no control over how he's represented. He's building Motiion to hand that control back to the artist — because he's one of them, not an outsider optimizing a market.

## Product

- **Name:** Motiion
- **One-liner:** Motiion is the operating system for the professional dance industry — where dancers manage their careers and industry pros discover, hire, and organize talent.
- **How it works:** Motiion is a web application sharing one backend and database with the Motiion iOS app, exposing the right functionality per user type over a single source of truth. For talent, it's a full desktop companion to the mobile app: create and manage a professional profile, upload and organize media, manage resumes and credits, receive and respond to opportunities, communicate with collaborators, manage availability, discover and RSVP to classes, sessions, auditions, castings, and events, and maintain their professional network. For industry professionals, it's an end-to-end talent operating system: search the verified talent database with advanced + AI filters, save talent into custom rosters, create Projects, and run multiple productions simultaneously. Projects are the central organizational object — every casting, rehearsal, event, fitting, call sheet, document, note, message thread, team member, and invited/confirmed dancer lives connected to its parent Project.
- **Key capabilities:**
  - Verified professional talent database with advanced + AI/semantic search, saved searches, rosters, and curated collections
  - Projects as the central operating hub for industry users — castings, rehearsals, production events, fittings, travel, call sheets, documents, notes, messaging, and invited/confirmed talent, all connected to the parent Project
  - Talent career management — profile, media, resume, credits, representation, physical attributes, skills, availability, location, and social links — as a desktop companion to the iOS app
  - Real-time, multi-permission collaboration for organizations, teams, and agencies (shared workspaces; agencies manage rosters and coordinate bookings on behalf of talent)
  - AI woven throughout — talent recommendations, natural-language filtering, scheduling suggestions, profile optimization, and workflow automation — plus discovery and RSVP for classes, auditions, and events with a curated marketplace
- **Platform:** web
- **Market differentiation:** Unlike actor-centric casting marketplaces (Backstage, Casting Networks) and the generic tools dance currently relies on (spreadsheets, Instagram DMs, group texts, PDFs), Motiion is professional creative software — closer to Linear, Notion, Figma, and Raycast than a recruiting site. It's purpose-built for dance, gives talent control over their own representation, and organizes every workflow around Projects in one fast, real-time, keyboard-first system.
- **Magic moment:** Two-sided. Talent: a dancer finishes their profile and Motiion instantly surfaces live castings and opportunities matched to their skills, look, and availability — the industry suddenly feels reachable instead of gated. Industry: a casting director types a plain-language query ("contemporary female dancers, LA-based, available in March, commercial experience") and a verified, bookable roster appears in seconds, then drags straight into a Project with one motion.

## Audience

- **Primary user:** Maya, 26, a professional commercial dancer in LA. She trains daily and auditions weekly, booking gigs through Instagram DMs, group texts, and word of mouth. She's talented but overlooked, with no single professional home for her portfolio, credits, and availability — and no control over how she's represented to the people hiring. She wants to be discovered on merit and to own her professional presence.
- **Secondary users:**
  - Casting directors, creative directors, and choreographers hiring dancers for commercials, tours, music videos, and live events
  - Talent agencies managing dancer rosters and coordinating bookings on behalf of their talent
  - Event organizers, studios, and class/convention producers who market to dancers via curated placements and the classes/events marketplace
- **Current alternatives:** Instagram and TikTok DMs, group texts, email chains, PDF resumes and reels, spreadsheets, agency rolodexes, and actor-centric casting sites like Backstage and Casting Networks that don't fit dance.
- **Frustrations:** Everything is fragmented and manual, with no single source of truth. Dancers are overlooked and can't control how they're represented; industry pros can't efficiently search verified, bookable dance talent; and existing casting sites are built for actors, not the specific needs of dance hiring.

## Business

- **Revenue model:** freemium
  - Talent join free (this fills the verified database — the supply side and moat). Industry professionals pay for the operating-system tiers (advanced search, Projects, rosters, collaboration, seats). Layered on top: a **marketplace take-rate** on classes and events booked through the platform, and **curated paid placements** — vetted, relevant ads dancers actually want to see (e.g. a major LA dance event buying direct access to the exact dancers likely to attend).
- **90-day goal:** 1,000 talent profiles, 75 industry accounts, $3–5k MRR from industry tiers, and one flagship LA dance event marketed on-platform via a curated placement.
- **6-month vision:** LA beachhead locked — ~2,500 talent, 150 industry orgs, ~$15k MRR, the marketplace take-rate live on classes and events, and iOS + web running on one shared backend in production.
- **Constraints:** Design-led solo founder building with AI coding agents around a full-time UX job on a bootstrapped budget — strong on product/design, leaning on AI for backend depth. The binding risk is scope creep: the long-term vision is an entire industry operating system, so ruthless MVP discipline is essential.
- **Go-to-market:** LA dance community-first — seed through Jay's own network, studios, choreographers, and agencies, showing up in person at classes and auditions to drive word of mouth among dancers — combined with a partnership-led motion: co-marketing with LA studios, conventions, and major dance events (the curated-placement customers) who bring the dancers while Motiion gives them reach.

## Brand Voice

- **Personality:** Confident creative insider — sharp, modern, and culturally fluent. Motiion speaks *dancer*, not corporate: premium but human, built by someone who's been in the room.
- **Tone of voice:** Direct and premium. Short, confident sentences; no hype, no jargon. Example error: "That didn't save. Try again." Example success: "You're live. Casting directors can find you now."

> Visual identity (mood, anti-patterns, design tokens) is deliberately not
> captured here — it lives in docs/design.md, generated by the Design System
> skill from image references.

## Tech Stack

- **App type:** web
- **Frontend:** Next.js 16 + React 19 — already in the repo; largest ecosystem, best AI-coding-tool support, deploys cleanly to Vercel. Styling with Tailwind CSS 4; motion via Motion + Lenis for the premium, animation-forward feel.
- **Backend:** Supabase — the single shared backend for both web and iOS; managed Postgres, real-time subscriptions, storage, and auth in one platform with strong TypeScript support.
- **Database:** Supabase Postgres — relational data fits the core entity model (Organizations, Teams, Users, Profiles, Projects, Castings, Events, Rosters, Talent Lists, Activities, Messages, Documents, Media Assets, Notifications); Postgres also enables vector/semantic search for AI features.
- **Auth:** Supabase Auth — native to the chosen backend; email/OAuth and callback flows already scaffolded in the repo; supports the organization/team permission model.
- **Payments:** Stripe — Stripe Connect powers the marketplace take-rate on classes/events and payouts, and Stripe Billing handles industry subscription tiers on web; RevenueCat handles in-app subscriptions on iOS.
- **Analytics:** PostHog — product analytics, funnels, session replay, and feature flags in one tool; analytics components and dashboards already exist in the repo.
- **Email:** Resend — transactional email and notifications (invites, opportunity alerts, RSVPs), clean fit with the Next.js stack; Supabase Auth handles auth-specific emails.
- **Error tracking:** Sentry — catch crashes and errors in production before users report them.

## Tooling

- **Coding agent:** Cursor
