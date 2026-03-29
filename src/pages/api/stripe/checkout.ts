import { createPagesApiSupabaseClient } from '@/lib/supabase/pages-api'
import { handleStripeCheckoutPost } from '@/lib/stripe/checkout-handler'
import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * Pages Router API — avoids Next.js App Router "Failed to collect page data for /api/stripe/checkout"
 * during `next build` on Vercel. Same URL: POST /api/stripe/checkout
 */
export default async function stripeCheckoutApi(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const proto = (req.headers['x-forwarded-proto'] as string) || 'http'
  const host =
    (req.headers['x-forwarded-host'] as string) || (req.headers.host as string) || 'localhost'
  const url = `${proto}://${host}/api/stripe/checkout`

  const supabase = createPagesApiSupabaseClient(req, res)

  const request = new Request(url, {
    method: 'POST',
    headers: new Headers({
      'content-type': 'application/json',
      ...(req.headers.cookie ? { cookie: req.headers.cookie } : {}),
    }),
    body: JSON.stringify(req.body ?? {}),
  })

  try {
    const response = await handleStripeCheckoutPost(request, supabase)
    res.status(response.status)

    const raw = response.headers as Headers & { getSetCookie?: () => string[] }
    const setCookies = typeof raw.getSetCookie === 'function' ? raw.getSetCookie() : []
    if (setCookies.length > 0) {
      setCookies.forEach((c) => res.appendHeader('Set-Cookie', c))
    }
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') return
      res.setHeader(key, value)
    })

    const text = await response.text()
    res.send(text)
  } catch (err) {
    console.error('[pages/api/stripe/checkout]', err)
    res.status(500).json({ error: 'Checkout temporarily unavailable.' })
  }
}

export const config = {
  api: {
    bodyParser: true,
  },
}
