// =============================================================================
// Steam OpenID 2.0 authentication
//
// Flow:
//   1. buildAuthUrl()  → redirect user to Steam
//   2. Steam redirects back with signed query params
//   3. verifySteamCallback() → server-to-server validation with Steam
//   4. extractSteamId()  → parse the 64-bit Steam ID from claimed_id
// =============================================================================

const STEAM_OPENID_ENDPOINT = 'https://steamcommunity.com/openid/login'

// Matches the claimed_id format Steam always uses
const STEAM_ID_RE = /^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/

export function buildAuthUrl(callbackUrl: string): string {
  const realm = new URL(callbackUrl).origin

  const params = new URLSearchParams({
    'openid.ns':         'http://specs.openid.net/auth/2.0',
    'openid.mode':       'checkid_setup',
    'openid.return_to':  callbackUrl,
    'openid.realm':      realm,
    // Request identifier selection (Steam only supports this variant)
    'openid.identity':   'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
  })

  return `${STEAM_OPENID_ENDPOINT}?${params}`
}

// Verify the OpenID assertion that Steam POSTed to our callback URL.
// Returns the verified 64-bit Steam ID string, or null if verification fails.
//
// Security note: we MUST verify by re-submitting the params to Steam
// rather than trusting the params directly. Skipping this step would allow
// anyone to forge a Steam login by crafting the callback URL parameters.
export async function verifySteamCallback(
  incomingParams: URLSearchParams,
): Promise<string | null> {
  const mode = incomingParams.get('openid.mode')

  if (mode !== 'id_res') {
    // User canceled ('cancel') or unexpected mode
    return null
  }

  // Rebuild the params for the check_authentication request.
  // Steam requires all original params plus mode=check_authentication.
  const verifyParams = new URLSearchParams(incomingParams)
  verifyParams.set('openid.mode', 'check_authentication')

  let verifyResponse: Response
  try {
    verifyResponse = await fetch(STEAM_OPENID_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: verifyParams.toString(),
    })
  } catch (err) {
    console.error('[openid] Verification network error:', err)
    return null
  }

  if (!verifyResponse.ok) {
    console.error('[openid] Steam verification returned', verifyResponse.status)
    return null
  }

  const text = await verifyResponse.text()

  // Steam responds with a key:value body; is_valid:true indicates success
  if (!text.includes('is_valid:true')) {
    console.warn('[openid] Steam returned is_valid:false')
    return null
  }

  const claimedId = incomingParams.get('openid.claimed_id')
  return extractSteamId(claimedId)
}

// Parse the 64-bit Steam ID from the claimed_id URL.
export function extractSteamId(claimedId: string | null): string | null {
  if (!claimedId) return null
  const match = claimedId.match(STEAM_ID_RE)
  return match ? match[1] : null
}

// Fetch the public Steam profile for a given 64-bit Steam ID.
// Returns null if the API key is missing or the call fails.
export async function fetchSteamProfile(
  steamId: string,
): Promise<{ personaName: string; avatarUrl: string; profileUrl: string } | null> {
  const apiKey = process.env.STEAM_API_KEY
  if (!apiKey) {
    console.warn('[openid] STEAM_API_KEY not set — skipping profile fetch')
    return null
  }

  const url =
    'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?' +
    new URLSearchParams({ key: apiKey, steamids: steamId })

  try {
    const { steamFetch } = await import('./client')
    const res = await steamFetch(url)
    const data = await res.json()
    const player = data?.response?.players?.[0]
    if (!player) return null

    return {
      personaName: player.personaname,
      avatarUrl:   player.avatarfull,
      profileUrl:  player.profileurl,
    }
  } catch (err) {
    console.error('[openid] Failed to fetch Steam profile:', err)
    return null
  }
}
