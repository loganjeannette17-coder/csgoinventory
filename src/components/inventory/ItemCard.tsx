import { cn, formatUsd } from '@/lib/utils'

// ── Rarity ────────────────────────────────────────────────────────────────────

const RARITY: Record<
  string,
  { label: string; border: string; glow: string; text: string }
> = {
  consumer:    { label: 'Consumer',   border: 'border-[#b0c3d9]', glow: 'shadow-[#b0c3d9]/20', text: 'text-[#b0c3d9]' },
  industrial:  { label: 'Industrial', border: 'border-[#5e98d9]', glow: 'shadow-[#5e98d9]/20', text: 'text-[#5e98d9]' },
  mil_spec:    { label: 'Mil-Spec',   border: 'border-[#4b69ff]', glow: 'shadow-[#4b69ff]/20', text: 'text-[#4b69ff]' },
  restricted:  { label: 'Restricted', border: 'border-[#8847ff]', glow: 'shadow-[#8847ff]/20', text: 'text-[#8847ff]' },
  classified:  { label: 'Classified', border: 'border-[#d32ce6]', glow: 'shadow-[#d32ce6]/20', text: 'text-[#d32ce6]' },
  covert:      { label: 'Covert',     border: 'border-[#eb4b4b]', glow: 'shadow-[#eb4b4b]/20', text: 'text-[#eb4b4b]' },
  contraband:  { label: 'Contraband', border: 'border-[#e4ae39]', glow: 'shadow-[#e4ae39]/20', text: 'text-[#e4ae39]' },
}

const DEFAULT_RARITY = { label: '', border: 'border-gray-700', glow: '', text: 'text-gray-500' }

// ── Wear ──────────────────────────────────────────────────────────────────────

const WEAR: Record<string, { abbr: string; color: string }> = {
  factory_new:    { abbr: 'FN', color: 'text-green-400' },
  minimal_wear:   { abbr: 'MW', color: 'text-green-300' },
  field_tested:   { abbr: 'FT', color: 'text-yellow-400' },
  well_worn:      { abbr: 'WW', color: 'text-orange-400' },
  battle_scarred: { abbr: 'BS', color: 'text-red-400' },
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ItemCardData {
  id: string
  name: string
  market_hash_name: string
  icon_url: string
  icon_url_large: string | null
  rarity: string | null
  wear: string | null
  float_value: number | null
  market_price_usd: number | null
  is_marketable: boolean
  is_tradable: boolean
  is_listed: boolean
  is_in_auction: boolean
  inspect_link: string | null
  sticker_data: unknown
}

interface ItemCardProps {
  item: ItemCardData
  onClick?: (item: ItemCardData) => void
  compact?: boolean
}

export function ItemCard({ item, onClick, compact = false }: ItemCardProps) {
  const rarity = item.rarity ? (RARITY[item.rarity] ?? DEFAULT_RARITY) : DEFAULT_RARITY
  const wear   = item.wear   ? (WEAR[item.wear]   ?? null)              : null

  return (
    <button
      onClick={() => onClick?.(item)}
      className={cn(
        'group relative w-full text-left bg-gray-900 border rounded-xl overflow-hidden',
        'transition-all duration-150 hover:-translate-y-0.5',
        'hover:shadow-lg',
        rarity.border,
        rarity.glow && `hover:shadow-lg hover:${rarity.glow}`,
        onClick ? 'cursor-pointer' : 'cursor-default',
      )}
    >
      {/* Status badges */}
      {(item.is_listed || item.is_in_auction) && (
        <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
          {item.is_listed && (
            <span className="bg-green-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
              FOR SALE
            </span>
          )}
          {item.is_in_auction && (
            <span className="bg-yellow-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
              AUCTION
            </span>
          )}
        </div>
      )}

      {/* Item image */}
      <div className={cn('flex items-center justify-center bg-gray-950/60', compact ? 'h-28' : 'h-36')}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.icon_url_large ?? item.icon_url}
          alt={item.name}
          loading="lazy"
          className="h-full w-full object-contain p-2 transition-transform duration-150 group-hover:scale-105"
          // Steam CDN — add to next.config.js images.remotePatterns if using next/image
        />
      </div>

      {/* Info */}
      <div className={cn('px-3 pb-3', compact ? 'pt-2' : 'pt-2.5')}>
        {/* Name + wear */}
        <div className="flex items-start justify-between gap-1 mb-1">
          <p className="text-white text-xs font-medium leading-tight line-clamp-2 flex-1">
            {item.name}
          </p>
          {wear && (
            <span className={cn('text-[10px] font-bold shrink-0 mt-0.5', wear.color)}>
              {wear.abbr}
            </span>
          )}
        </div>

        {/* Float */}
        {item.float_value != null && (
          <p className="text-gray-500 text-[10px] mb-1">
            Float: {item.float_value.toFixed(8)}
          </p>
        )}

        {/* Price row */}
        <div className="flex items-center justify-between mt-1.5">
          {item.market_price_usd != null && item.is_marketable ? (
            <span className="text-green-400 text-sm font-semibold">
              {formatUsd(item.market_price_usd)}
            </span>
          ) : (
            <span className="text-gray-600 text-xs">—</span>
          )}

          {item.inspect_link && (
            <a
              href={item.inspect_link}
              onClick={(e) => e.stopPropagation()}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-300 transition-colors"
              title="Inspect in game"
            >
              <InspectIcon />
            </a>
          )}
        </div>
      </div>
    </button>
  )
}

function InspectIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
    </svg>
  )
}
