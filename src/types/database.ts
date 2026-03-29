// Auto-generated types should come from `supabase gen types typescript`.
// This file provides hand-written types that mirror schema.sql until you
// run the generator against your live project.

export type VisibilityType = 'public' | 'private'
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete'
export type AuctionStatus = 'pending' | 'active' | 'ended' | 'canceled'
export type ListingStatus = 'active' | 'sold' | 'canceled'
export type ItemRarity = 'consumer' | 'industrial' | 'mil_spec' | 'restricted' | 'classified' | 'covert' | 'contraband'
export type ItemWear = 'factory_new' | 'minimal_wear' | 'field_tested' | 'well_worn' | 'battle_scarred'
export type MessageStatus = 'sent' | 'delivered' | 'read'

export type PlanTier = 'basic' | 'pro'

/** Supabase `GenericTable` requires `Relationships` — without it, `.from()` becomes `never`. */
type EmptyRelationships = []

/** JSON column / RPC result (matches `supabase gen types` output). */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/** Declared outside `Database` so `inventory_items.Insert` is not circular (breaks `extends GenericSchema`). */
export type InventoryItemRow = {
  id: string
  user_id: string
  steam_asset_id: string
  steam_class_id: string
  steam_instance_id: string | null
  market_hash_name: string
  name: string
  name_color: string | null
  type: string | null
  collection: string | null
  rarity: ItemRarity | null
  wear: ItemWear | null
  float_value: number | null
  pattern_index: number | null
  sticker_data: unknown | null
  inspect_link: string | null
  icon_url: string | null
  icon_url_large: string | null
  market_price_usd: number | null
  price_updated_at: string | null
  is_tradable: boolean
  is_marketable: boolean
  is_listed: boolean
  is_in_auction: boolean
  last_synced_at: string
  created_at: string
  updated_at: string
} & Record<string, unknown>

export type InventoryItemInsert = Omit<InventoryItemRow, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
  created_at?: string
  updated_at?: string
} & Record<string, unknown>

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          is_premium: boolean
          inventory_visibility: VisibilityType
          created_at: string
          updated_at: string
        } & Record<string, unknown>
        Insert: {
          id: string
          username: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          is_premium?: boolean
          inventory_visibility?: VisibilityType
          created_at?: string
          updated_at?: string
        } & Record<string, unknown>
        // Explicit Update avoids circular `Partial<Insert>` resolution issues with Supabase generics.
        Update: {
          username?: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          is_premium?: boolean
          inventory_visibility?: VisibilityType
          created_at?: string
          updated_at?: string
        } & Record<string, unknown>
        Relationships: [
          {
            foreignKeyName: 'subscriptions_user_id_fkey'
            columns: ['id']
            isOneToOne: false
            referencedRelation: 'subscriptions'
            referencedColumns: ['user_id']
          },
          {
            foreignKeyName: 'steam_accounts_user_id_fkey'
            columns: ['id']
            isOneToOne: true
            referencedRelation: 'steam_accounts'
            referencedColumns: ['user_id']
          },
          {
            foreignKeyName: 'inventory_items_user_id_fkey'
            columns: ['id']
            isOneToOne: false
            referencedRelation: 'inventory_items'
            referencedColumns: ['user_id']
          },
        ]
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_customer_id: string
          stripe_subscription_id: string | null
          stripe_price_id: string | null
          plan: PlanTier | null
          status: SubscriptionStatus
          current_period_start: string | null
          current_period_end: string | null
          cancel_at: string | null
          canceled_at: string | null
          grace_period_ends_at: string | null
          created_at: string
          updated_at: string
        } & Record<string, unknown>
        Insert: {
          id?: string
          user_id: string
          stripe_customer_id: string
          stripe_subscription_id?: string | null
          stripe_price_id?: string | null
          plan?: PlanTier | null
          status?: SubscriptionStatus
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at?: string | null
          canceled_at?: string | null
          grace_period_ends_at?: string | null
          created_at?: string
          updated_at?: string
        } & Record<string, unknown>
        Update: Partial<Database['public']['Tables']['subscriptions']['Insert']> & Record<string, unknown>
        Relationships: [
          {
            foreignKeyName: 'subscriptions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      steam_accounts: {
        Row: {
          id: string
          user_id: string
          steam_id: string
          persona_name: string | null
          profile_url: string | null
          avatar_url: string | null
          is_public: boolean
          last_synced_at: string | null
          created_at: string
          updated_at: string
        } & Record<string, unknown>
        Insert: {
          id?: string
          user_id: string
          steam_id: string
          persona_name?: string | null
          profile_url?: string | null
          avatar_url?: string | null
          is_public?: boolean
          last_synced_at?: string | null
          created_at?: string
          updated_at?: string
        } & Record<string, unknown>
        Update: Partial<Database['public']['Tables']['steam_accounts']['Insert']> & Record<string, unknown>
        Relationships: [
          {
            foreignKeyName: 'steam_accounts_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      inventory_items: {
        Row: InventoryItemRow
        Insert: InventoryItemInsert
        Update: Partial<InventoryItemInsert> & Record<string, unknown>
        Relationships: [
          {
            foreignKeyName: 'inventory_items_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      inventory_snapshots: {
        Row: {
          id: string
          user_id: string
          total_value_usd: number
          item_count: number
          captured_at: string
        } & Record<string, unknown>
        Insert: {
          id?: string
          user_id: string
          total_value_usd: number
          item_count: number
          captured_at?: string
        } & Record<string, unknown>
        Update: Partial<Database['public']['Tables']['inventory_snapshots']['Insert']> & Record<string, unknown>
        Relationships: EmptyRelationships
      }
      auctions: {
        Row: {
          id: string
          seller_id: string
          item_id: string
          starting_bid_usd: number
          reserve_price_usd: number | null
          min_bid_increment: number
          current_bid_usd: number | null
          current_bidder_id: string | null
          bid_count: number
          buy_now_price_usd: number | null
          platform_fee_usd: number
          status: AuctionStatus
          starts_at: string
          ends_at: string
          description: string | null
          created_at: string
          updated_at: string
        } & Record<string, unknown>
        Insert: {
          id?: string
          seller_id: string
          item_id: string
          starting_bid_usd: number
          reserve_price_usd?: number | null
          min_bid_increment?: number
          current_bid_usd?: number | null
          current_bidder_id?: string | null
          bid_count?: number
          buy_now_price_usd?: number | null
          platform_fee_usd?: number
          status?: AuctionStatus
          starts_at?: string
          ends_at: string
          description?: string | null
          created_at?: string
          updated_at?: string
        } & Record<string, unknown>
        Update: Partial<Database['public']['Tables']['auctions']['Insert']> & Record<string, unknown>
        Relationships: [
          {
            foreignKeyName: 'auctions_seller_id_fkey'
            columns: ['seller_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'auctions_item_id_fkey'
            columns: ['item_id']
            isOneToOne: true
            referencedRelation: 'inventory_items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'auctions_current_bidder_id_fkey'
            columns: ['current_bidder_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      bids: {
        Row: {
          id: string
          auction_id: string
          bidder_id: string
          amount_usd: number
          placed_at: string
        } & Record<string, unknown>
        Insert: {
          id?: string
          auction_id: string
          bidder_id: string
          amount_usd: number
          placed_at?: string
        } & Record<string, unknown>
        Update: Partial<Database['public']['Tables']['bids']['Insert']> & Record<string, unknown>
        Relationships: [
          {
            foreignKeyName: 'bids_auction_id_fkey'
            columns: ['auction_id']
            isOneToOne: false
            referencedRelation: 'auctions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bids_bidder_id_fkey'
            columns: ['bidder_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      listings: {
        Row: {
          id: string
          seller_id: string
          item_id: string
          price_usd: number
          platform_fee_usd: number
          description: string | null
          status: ListingStatus
          buyer_id: string | null
          sold_at: string | null
          created_at: string
          updated_at: string
        } & Record<string, unknown>
        Insert: {
          id?: string
          seller_id: string
          item_id: string
          price_usd: number
          platform_fee_usd?: number
          description?: string | null
          status?: ListingStatus
          buyer_id?: string | null
          sold_at?: string | null
          created_at?: string
          updated_at?: string
        } & Record<string, unknown>
        Update: Partial<Database['public']['Tables']['listings']['Insert']> & Record<string, unknown>
        Relationships: [
          {
            foreignKeyName: 'listings_seller_id_fkey'
            columns: ['seller_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'listings_item_id_fkey'
            columns: ['item_id']
            isOneToOne: true
            referencedRelation: 'inventory_items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'listings_buyer_id_fkey'
            columns: ['buyer_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      conversations: {
        Row: {
          id: string
          user_a_id: string
          user_b_id: string
          last_message_at: string | null
          created_at: string
        } & Record<string, unknown>
        Insert: {
          id?: string
          user_a_id: string
          user_b_id: string
          last_message_at?: string | null
          created_at?: string
        } & Record<string, unknown>
        Update: Partial<Database['public']['Tables']['conversations']['Insert']> & Record<string, unknown>
        Relationships: [
          {
            foreignKeyName: 'conversations_user_a_id_fkey'
            columns: ['user_a_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'conversations_user_b_id_fkey'
            columns: ['user_b_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          content: string
          status: MessageStatus
          read_at: string | null
          created_at: string
        } & Record<string, unknown>
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          content: string
          status?: MessageStatus
          read_at?: string | null
          created_at?: string
        } & Record<string, unknown>
        Update: Partial<Database['public']['Tables']['messages']['Insert']> & Record<string, unknown>
        Relationships: [
          {
            foreignKeyName: 'messages_conversation_id_fkey'
            columns: ['conversation_id']
            isOneToOne: false
            referencedRelation: 'conversations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'messages_sender_id_fkey'
            columns: ['sender_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      place_bid: {
        Args: {
          p_auction_id: string
          p_bidder_id: string
          p_amount: number
        } & Record<string, unknown>
        Returns: Json
      }
      purchase_listing: {
        Args: {
          p_listing_id: string
          p_buyer_id: string
        } & Record<string, unknown>
        Returns: Json
      }
    }
    Enums: {
      visibility_type: VisibilityType
      subscription_status: SubscriptionStatus
      auction_status: AuctionStatus
      listing_status: ListingStatus
      item_rarity: ItemRarity
      item_wear: ItemWear
      message_status: MessageStatus
    }
  }
}
