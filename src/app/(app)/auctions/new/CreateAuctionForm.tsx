'use client'

import { cn, formatUsd } from '@/lib/utils'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface EligibleItem {
  id: string
  name: string
  icon_url: string | null
  rarity: string | null
  wear: string | null
  market_price_usd: number | null
}

interface Props {
  eligibleItems: EligibleItem[]
}

const DURATION_OPTIONS = [
  { hours: 1,   label: '1 hour'  },
  { hours: 6,   label: '6 hours' },
  { hours: 12,  label: '12 hours'},
  { hours: 24,  label: '1 day'   },
  { hours: 72,  label: '3 days'  },
  { hours: 168, label: '7 days'  },
]

const WEAR_ABBR: Record<string, string> = {
  factory_new: 'FN', minimal_wear: 'MW', field_tested: 'FT',
  well_worn: 'WW', battle_scarred: 'BS',
}

const RARITY_TEXT: Record<string, string> = {
  consumer: 'text-[#b0c3d9]', industrial: 'text-[#5e98d9]', mil_spec: 'text-[#4b69ff]',
  restricted: 'text-[#8847ff]', classified: 'text-[#d32ce6]', covert: 'text-[#eb4b4b]',
  contraband: 'text-[#e4ae39]',
}

const RARITY_RING: Record<string, string> = {
  consumer: 'ring-[#b0c3d9]/30',
  industrial: 'ring-[#5e98d9]/30',
  mil_spec: 'ring-[#4b69ff]/30',
  restricted: 'ring-[#8847ff]/30',
  classified: 'ring-[#d32ce6]/30',
  covert: 'ring-[#eb4b4b]/30',
  contraband: 'ring-[#e4ae39]/30',
}

export default function CreateAuctionForm({ eligibleItems }: Props) {
  const router = useRouter()

  const [selectedItemId, setSelectedItemId] = useState(eligibleItems[0]?.id ?? '')
  const [startingBid,    setStartingBid]    = useState('')
  const [buyNowPrice,    setBuyNowPrice]     = useState('')
  const [minIncrement,   setMinIncrement]   = useState('0.50')
  const [durationHours,  setDurationHours]  = useState(24)
  const [description,    setDescription]   = useState('')
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState<string | null>(null)

  const startingBidNum = parseFloat(startingBid)
  const buyNowNum      = parseFloat(buyNowPrice)
  const incrementNum   = parseFloat(minIncrement)

  // Live validation
  const errors: Record<string, string> = {}
  if (startingBid && (isNaN(startingBidNum) || startingBidNum <= 0))
    errors.startingBid = 'Must be > 0'
  if (buyNowPrice && (isNaN(buyNowNum) || buyNowNum <= startingBidNum))
    errors.buyNowPrice = 'Must be higher than starting bid'
  if (minIncrement && (isNaN(incrementNum) || incrementNum < 0.01))
    errors.minIncrement = 'Must be ≥ $0.01'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (Object.keys(errors).length) return
    if (!selectedItemId) { setError('Select an item.'); return }

    setError(null)
    setLoading(true)

    const res = await fetch('/api/auctions', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemId:          selectedItemId,
        startingBidUsd:  startingBidNum,
        buyNowPriceUsd:  buyNowPrice ? buyNowNum : undefined,
        minIncrement:    incrementNum,
        durationHours,
        description:     description || undefined,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Failed to create auction.')
      setLoading(false)
      return
    }

    router.push(`/auctions/${data.auctionId}`)
  }

  if (eligibleItems.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center space-y-3">
        <p className="text-gray-300 font-medium">No eligible items</p>
        <p className="text-gray-500 text-sm">
          Items must be marketable and not already listed or in an auction.
          Sync your inventory first if it&apos;s empty.
        </p>
        <a href="/dashboard" className="inline-block text-blue-400 hover:underline text-sm">
          Go to dashboard
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Item picker */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-white">Select item</h2>
          <span className="text-xs text-gray-500">{eligibleItems.length} available</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-80 overflow-y-auto pr-1">
          {eligibleItems.map((item) => (
            <label
              key={item.id}
              htmlFor={`auction-item-${item.id}`}
              className={cn(
                'relative flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border bg-gray-800/40 p-2 text-left transition-all',
                selectedItemId === item.id
                  ? `border-blue-500 bg-blue-500/10 ring-1 ${item.rarity ? (RARITY_RING[item.rarity] ?? 'ring-blue-500/30') : 'ring-blue-500/30'}`
                  : 'border-gray-700 hover:border-gray-500',
              )}
            >
              <input
                id={`auction-item-${item.id}`}
                type="radio"
                name="auction-item"
                value={item.id}
                checked={selectedItemId === item.id}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="sr-only"
              />
              {selectedItemId === item.id && (
                <span className="absolute right-1.5 top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white text-[11px] font-bold">
                  ✓
                </span>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.icon_url ?? ''}
                alt={item.name}
                draggable={false}
                className="h-16 w-full object-contain select-none"
              />
              <p className="text-xs text-gray-200 line-clamp-2 text-center leading-tight">
                {item.name}
                {selectedItemId === item.id && (
                  <span className="ml-1 inline-flex rounded bg-blue-500/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-blue-300">
                    Selected
                  </span>
                )}
              </p>
              <div className="flex gap-1 items-center">
                {item.wear && (
                  <span className="text-[10px] text-gray-500">{WEAR_ABBR[item.wear]}</span>
                )}
                {item.market_price_usd && (
                  <span className={cn('text-[10px] font-semibold', item.rarity ? (RARITY_TEXT[item.rarity] ?? 'text-gray-400') : 'text-gray-400')}>
                    {formatUsd(item.market_price_usd)}
                  </span>
                )}
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-white">Pricing</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <FormField label="Starting bid *" error={errors.startingBid}>
            <PriceInput value={startingBid} onChange={setStartingBid} placeholder="0.00" />
          </FormField>

          <FormField label="Buy-now price (optional)" error={errors.buyNowPrice} hint="Bidders can instantly win at this price.">
            <PriceInput value={buyNowPrice} onChange={setBuyNowPrice} placeholder="e.g. 25.00" />
          </FormField>

          <FormField label="Minimum bid increment *" error={errors.minIncrement} hint="How much each bid must raise by.">
            <PriceInput value={minIncrement} onChange={setMinIncrement} placeholder="0.50" />
          </FormField>
        </div>
      </section>

      {/* Duration */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-3">
        <h2 className="text-sm font-semibold text-white">Duration</h2>
        <div className="flex flex-wrap gap-2">
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.hours}
              type="button"
              onClick={() => setDurationHours(opt.hours)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
                durationHours === opt.hours
                  ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Description */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-2">
        <h2 className="text-sm font-semibold text-white">Description (optional)</h2>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Any notes for bidders..."
          className="input resize-none w-full"
        />
        <p className="text-xs text-gray-600 text-right">{description.length}/500</p>
      </section>

      {error && (
        <p className="text-red-400 text-sm bg-red-950/40 border border-red-800 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-3 items-center">
        <button
          type="submit"
          disabled={loading || !selectedItemId || !startingBid || Object.keys(errors).length > 0}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-6 py-2.5 font-semibold text-sm transition-colors flex items-center gap-2"
        >
          {loading && <Spinner />}
          Start auction
        </button>
        <Link href="/auctions" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
          Cancel
        </Link>
      </div>
    </form>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PriceInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
      <input
        type="number" step="0.01" min="0.01"
        value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input pl-7 w-full"
      />
    </div>
  )
}

function FormField({ label, hint, error, children }: {
  label: string; hint?: string; error?: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm text-gray-300">{label}</label>
      {children}
      {error && <p className="text-red-400 text-xs">{error}</p>}
      {hint && !error && <p className="text-gray-600 text-xs">{hint}</p>}
    </div>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
