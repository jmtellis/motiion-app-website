<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Website journey polish

For signup-through-confirmation improvements, consult `docs/website-polish/journey.md` and `docs/website-polish/improvements.md`. Capture the user's note against its journey step, inspect the UI/server/database path, and review loading, errors, retries, authorization, query cost, and state consistency alongside the UX change. Verify the affected behavior and update the log; keep unrelated improvements in the backlog. Use staging and Stripe test mode for local walkthroughs. Never commit `.staging/` credentials, email codes, or copied profile data.
