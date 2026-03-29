import type Stripe from 'stripe'

/**
 * Stripe secret keys are long random strings (sk_test_… or sk_live_…).
 * Placeholders like `sk_live_..._key` or docs with asterisks will fail API calls with "Invalid API Key".
 */
function readStripeSecretKey(): string {
  const raw = process.env.STRIPE_SECRET_KEY
  if (!raw?.trim()) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }
  // Allow `.env` lines like `STRIPE_SECRET_KEY=sk_live_xxx  # comment`
  // by stripping the inline comment before validating.
  const key = raw.trim().replace(/\s*#.*$/, '').trim()
  const finalKey = key.split(/\s+/)[0]?.trim()

  if (!finalKey) {
    throw new Error('STRIPE_SECRET_KEY is empty after sanitization.')
  }

  if (/\s/.test(finalKey)) {
    throw new Error(
      'STRIPE_SECRET_KEY must be a single line with no spaces or line breaks.',
    )
  }
  if (!finalKey.startsWith('sk_test_') && !finalKey.startsWith('sk_live_')) {
    throw new Error(
      'STRIPE_SECRET_KEY must start with sk_test_ (test mode) or sk_live_ (live).',
    )
  }
  // Common mistakes: copied from examples / masked docs
  if (
    finalKey.endsWith('_key') ||
    finalKey.includes('...') ||
    /\*{2,}/.test(finalKey) ||
    /placeholder/i.test(finalKey)
  ) {
    throw new Error(
      'STRIPE_SECRET_KEY looks like a placeholder. In Stripe Dashboard → Developers → API keys, click Reveal and copy the entire Secret key (not the Publishable key).',
    )
  }
  if (finalKey.length < 90) {
    throw new Error(
      'STRIPE_SECRET_KEY is too short — paste the full secret key from Stripe (usually 100+ characters).',
    )
  }
  return finalKey
}

// Load stripe-node only on first use. A top-level `import Stripe from 'stripe'` runs SDK init
// when the module graph loads and can break `next build` ("Failed to collect page data" for
// /api/stripe/*) because Next evaluates route modules during static analysis.
let stripeSingleton: Stripe | null = null

function loadStripeConstructor(): typeof import('stripe').default {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- intentional lazy load for build
  const mod = require('stripe') as { default: typeof import('stripe').default }
  return mod.default
}

export function getStripe(): Stripe {
  if (!stripeSingleton) {
    const StripeSdk = loadStripeConstructor()
    const secret = readStripeSecretKey()
    console.log(
      `[stripe] Using secret key ${secret.startsWith('sk_live_') ? 'live' : 'test'} (prefix ${secret.slice(0, 10)}, len ${secret.length})`,
    )
    stripeSingleton = new StripeSdk(secret, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    })
  }
  return stripeSingleton
}

// Retrieve or create a Stripe customer for a given user.
// Idempotent: if the user already has a customer ID, returns it.
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
): Promise<string> {
  // Search for an existing customer by metadata to avoid duplicates
  const existing = await getStripe().customers.search({
    query: `metadata['supabase_user_id']:'${userId}'`,
    limit: 1,
  })

  if (existing.data.length > 0) {
    return existing.data[0].id
  }

  const customer = await getStripe().customers.create({
    email,
    metadata: { supabase_user_id: userId },
  })

  return customer.id
}

// Verify and construct a Stripe webhook event from raw body + signature.
// Throws if the signature is invalid — caller should return 400.
export function constructWebhookEvent(
  rawBody: string,
  signature: string,
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    ?.trim()
    .replace(/\s*#.*$/, '')
    .trim()
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set')
  }
  return getStripe().webhooks.constructEvent(
    rawBody,
    signature,
    webhookSecret,
  )
}
