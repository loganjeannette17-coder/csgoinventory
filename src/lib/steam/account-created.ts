import { cache } from 'react'

/**
 * Steam account creation time from GetPlayerSummaries (`timecreated`).
 * This is when the Steam account was registered — a reasonable proxy for “how long you’ve been on Steam,”
 * not the exact moment you launched CS2/CS:GO (Steam does not expose that in this API).
 */
export const fetchSteamAccountCreatedIso = cache(async (steamId: string): Promise<string | null> => {
  const apiKey = process.env.STEAM_API_KEY
  if (!apiKey) return null

  const url =
    'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?' +
    new URLSearchParams({ key: apiKey, steamids: steamId })

  try {
    const { steamFetch } = await import('./client')
    const res = await steamFetch(url)
    const data = (await res.json()) as {
      response?: { players?: { timecreated?: number }[] }
    }
    const player = data?.response?.players?.[0]
    const tc = player?.timecreated
    if (typeof tc === 'number' && tc > 0) {
      return new Date(tc * 1000).toISOString()
    }
  } catch (err) {
    console.error('[steam] GetPlayerSummaries (timecreated) failed:', err)
  }
  return null
})
