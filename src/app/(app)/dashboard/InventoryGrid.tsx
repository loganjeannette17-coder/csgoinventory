'use client'

import { ItemCard, type ItemCardData } from '@/components/inventory/ItemCard'
import { formatUsd } from '@/lib/utils'
import { useMemo, useState } from 'react'

const RARITY_OPTIONS = [
  { value: '',           label: 'All rarities' },
  { value: 'contraband', label: 'Contraband' },
  { value: 'covert',     label: 'Covert' },
  { value: 'classified', label: 'Classified' },
  { value: 'restricted', label: 'Restricted' },
  { value: 'mil_spec',   label: 'Mil-Spec' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'consumer',   label: 'Consumer' },
]

const WEAR_OPTIONS = [
  { value: '',               label: 'All wear' },
  { value: 'factory_new',    label: 'Factory New' },
  { value: 'minimal_wear',   label: 'Minimal Wear' },
  { value: 'field_tested',   label: 'Field-Tested' },
  { value: 'well_worn',      label: 'Well-Worn' },
  { value: 'battle_scarred', label: 'Battle-Scarred' },
]

type SortKey = 'price_desc' | 'price_asc' | 'name_asc' | 'rarity_desc'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'price_desc',  label: 'Price: High → Low' },
  { value: 'price_asc',   label: 'Price: Low → High' },
  { value: 'name_asc',    label: 'Name A → Z' },
  { value: 'rarity_desc', label: 'Rarity' },
]

const RARITY_ORDER = [
  'contraband', 'covert', 'classified', 'restricted', 'mil_spec', 'industrial', 'consumer',
]

interface Props {
  items: ItemCardData[]
}

export function InventoryGrid({ items }: Props) {
  const [search,      setSearch]      = useState('')
  const [rarity,      setRarity]      = useState('')
  const [wear,        setWear]        = useState('')
  const [sort,        setSort]        = useState<SortKey>('price_desc')
  const [marketOnly,  setMarketOnly]  = useState(false)

  const filtered = useMemo(() => {
    let result = items

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter((i) => i.name.toLowerCase().includes(q))
    }

    if (rarity)     result = result.filter((i) => i.rarity === rarity)
    if (wear)       result = result.filter((i) => i.wear === wear)
    if (marketOnly) result = result.filter((i) => i.is_marketable)

    return [...result].sort((a, b) => {
      switch (sort) {
        case 'price_desc':
          return (b.market_price_usd ?? -1) - (a.market_price_usd ?? -1)
        case 'price_asc':
          return (a.market_price_usd ?? Infinity) - (b.market_price_usd ?? Infinity)
        case 'name_asc':
          return a.name.localeCompare(b.name)
        case 'rarity_desc': {
          const ai = RARITY_ORDER.indexOf(a.rarity ?? '')
          const bi = RARITY_ORDER.indexOf(b.rarity ?? '')
          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
        }
      }
    })
  }, [items, search, rarity, wear, sort, marketOnly])

  const totalFiltered = useMemo(
    () => filtered.reduce((s, i) => s + (i.market_price_usd ?? 0), 0),
    [filtered],
  )

  function clearFilters() {
    setSearch('')
    setRarity('')
    setWear('')
    setMarketOnly(false)
    setSort('price_desc')
  }

  const hasFilters = search || rarity || wear || marketOnly

  if (items.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p className="text-lg font-medium text-gray-400">No items in inventory</p>
        <p className="text-sm mt-1">Sync your Steam inventory to see your CS2 skins here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
          <input
            type="text"
            placeholder="Search items…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-gray-900 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg pl-8 pr-3 py-1.5 text-white text-sm outline-none transition-colors w-52"
          />
        </div>

        <Select value={rarity} onChange={setRarity} options={RARITY_OPTIONS} />
        <Select value={wear}   onChange={setWear}   options={WEAR_OPTIONS}   />
        <Select
          value={sort}
          onChange={(v) => setSort(v as SortKey)}
          options={SORT_OPTIONS}
        />

        <label className="flex items-center gap-1.5 text-sm text-gray-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={marketOnly}
            onChange={(e) => setMarketOnly(e.target.checked)}
            className="accent-blue-500"
          />
          Marketable only
        </label>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Result summary */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          {filtered.length} item{filtered.length !== 1 ? 's' : ''}
          {hasFilters ? ` of ${items.length}` : ''}
        </span>
        {filtered.length > 0 && (
          <span>
            Filtered value:{' '}
            <span className="text-green-400 font-medium">{formatUsd(totalFiltered)}</span>
          </span>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No items match your filters.</p>
          <button onClick={clearFilters} className="text-blue-400 text-sm mt-1 hover:underline">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Select({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-gray-900 border border-gray-700 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-white text-sm outline-none transition-colors cursor-pointer"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="currentColor">
      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
    </svg>
  )
}
