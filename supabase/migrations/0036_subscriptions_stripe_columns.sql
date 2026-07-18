-- Align the shared subscriptions table (created by the iOS app schema) with the
-- website's Stripe billing sync. Additive only; existing Apple IAP rows are preserved.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS customer_id TEXT,
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'free';

-- Backfill provider from the legacy billing_source column.
UPDATE public.subscriptions SET provider = billing_source WHERE provider IS NULL;
UPDATE public.subscriptions SET tier = 'pro' WHERE status IN ('active', 'trialing') AND tier = 'free';

ALTER TABLE public.subscriptions ALTER COLUMN provider SET DEFAULT 'stripe';
ALTER TABLE public.subscriptions ALTER COLUMN provider SET NOT NULL;

-- Allow web billing sources alongside the mobile ones.
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_billing_source_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_billing_source_check
  CHECK (billing_source IN ('polar', 'apple_iap', 'stripe', 'revenuecat'));

-- Required for upsert onConflict (user_id, provider) used by the Stripe/RevenueCat webhooks.
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_provider_idx
  ON public.subscriptions(user_id, provider);
