# Website and iOS workspace parity

This change aligns the requested talent and industry surfaces with the iOS workspace.

## Navigation

- Talent: Home, Discover, Opportunities, Bookings, Inbox, Calendar, Portfolio.
- Industry: Home, Discover, Projects, Bookings, Inbox, Calendar, Roster.
- Industry sidebar quick-search control removed; the keyboard command palette remains available.
- Existing URLs remain compatible. Talent Bookings uses `/deal-memos`, and Calendar uses `/schedule`.

## Home

Both account types use the shared Home feed, including personal upcoming activities directly below featured talent cards, public classes and sessions, featured talent collections, Meet the Cast, and Featured Brands.

Featured collections use the same `featured_carousel_items` feed as iOS, preferring the viewer-aware `list_featured_carousel_items` RPC. All curated collections remain browsable in the carousel. Explicit CMS talent IDs resolve in batches from the public talent view without the Navigator verification filter or 200-person truncation; both collections and cast details use portrait grids. Authenticated Home visits request a best-effort Notion carousel/campaign refresh, throttled to once every five minutes per browser session. Existing synced content stays visible if refresh fails. A staging live-catalog mirror remains read-only and does not invoke synchronization against another environment.

Featured Brands displays dark-tinted 72px logos from active `campaigns`, with the same start/end dates and priority ordering as iOS. Local Meet the Cast events now hydrate accepted talent avatar previews. Cast detail sections use portrait cards in two columns, switching to one column below 600px.

## Discover and Opportunities

Browse keeps search on the left and talent type, styles, and filters on the right. Location lives inside Filters. Artist-credit searches retain their meaning when other filters change; combined filters apply to credit results while preserving match evidence and ranking. Explore uses a light canvas, including its vignette.

Opportunity lists group roles by project and omit card chips. Every card opens the main casting overview; role selection, submission and decline actions live inside the detail panel. Casting details use a centered client identity, labeled stats, separated sections, and readable calendar dates.

## Bookings, Inbox, and Portfolio

Both booking desks use In Progress, Confirmed, and Past. Paid/accepted memos are Confirmed; overdue payment requests and closed bookings are Past. Industry memos group by project, with internal project coordination retained in a disclosure. Talent uses the iOS `list_talent_bookings` RPC, includes memo-only offers and submitted castings, groups booking relationships by project, and opens a booking detail panel with schedule and agreement/request links.

Inbox uses the workspace’s separate right-side frame for the thread, visible from initial load on desktop, including an empty industry inbox. Mobile opens a single pane at a time.

Portfolio retains all six editing cards, including Highlights and its editor. Only the duplicate Highlights summary section is removed.

## Validation

- Production build passed (`npm run build -- --webpack`).
- TypeScript and lint checks passed on changed files.
- All 68 regression tests passed for opportunity grouping, credit filtering, booking segments, inbox partitions, search intent, and deal memo rules.
- Browser checks with temporary sample data for desktop/mobile Browse, light Explore, split Inbox, and booking tabs. Temporary preview code was removed.
- Live account, production Notion synchronization, and booking RPC integration require a signed-in account and were not exercised by these sample-data checks.

Follow-up validation: 39 targeted tests passed, including date formatting; desktop Inbox frames and desktop/mobile portrait grids were visually checked with temporary sample data.
