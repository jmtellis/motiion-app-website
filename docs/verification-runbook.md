# Verification runbook — Motiion MVP

Manual admin review for talent profile verification (PRD Open Q1 default).

## Goal

Mark a dancer profile as verified so they appear in industry search (`is_verified = true` on `professional_profiles`).

## Steps

1. Sign in as a platform admin (requires `auth_is_platform_admin()` RPC from the shared Supabase project).
2. Open `/admin/analytics` to confirm admin access.
3. In Supabase SQL editor or admin tooling, run:

```sql
UPDATE professional_profiles
SET is_verified = TRUE, verified_at = NOW()
WHERE slug = '<talent-slug>';
```

4. Confirm the profile appears in Talent Navigator with verified-first ordering.
5. Record time spent — target baseline for LA beta operational planning.

## Unverify

```sql
UPDATE professional_profiles
SET is_verified = FALSE, verified_at = NULL
WHERE slug = '<talent-slug>';
```

## Notes

- Invite-seeded beta talent can be bulk-verified via `scripts/seed-la-beta.ts`.
- Verification is lightweight for MVP; tighten RLS policy `professional_profiles_admin_verify` before production.
