export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      daily_metrics: {
        Row: {
          as_of_date: string
          created_at: string
          id: string
          lowest_item_price: number | null
          lowest_total_price: number | null
          max_product_cost: number | null
          num_listings: number | null
          product_id: string
          product_url: string | null
          target_product_cost: number | null
          total_quantity_listed: number | null
        }
        Insert: {
          as_of_date: string
          created_at?: string
          id?: string
          lowest_item_price?: number | null
          lowest_total_price?: number | null
          max_product_cost?: number | null
          num_listings?: number | null
          product_id: string
          product_url?: string | null
          target_product_cost?: number | null
          total_quantity_listed?: number | null
        }
        Update: {
          as_of_date?: string
          created_at?: string
          id?: string
          lowest_item_price?: number | null
          lowest_total_price?: number | null
          max_product_cost?: number | null
          num_listings?: number | null
          product_id?: string
          product_url?: string | null
          target_product_cost?: number | null
          total_quantity_listed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_metrics_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_metrics_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_unmapped_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_contents: {
        Row: {
          contained_name: string
          created_at: string
          id: string
          product_id: string
          quantity: number | null
          rarity: string | null
        }
        Insert: {
          contained_name: string
          created_at?: string
          id?: string
          product_id: string
          quantity?: number | null
          rarity?: string | null
        }
        Update: {
          contained_name?: string
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number | null
          rarity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_contents_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_contents_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_unmapped_products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          created_at: string
          id: string
          language: string | null
          mtgjson_uuid: string
          name: string
          raw_json: Json | null
          release_date: string | null
          set_code: string | null
          tcg_is_verified: boolean
          tcgplayer_product_id: number | null
          type: string
          upc: string | null
          upc_is_verified: boolean
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          language?: string | null
          mtgjson_uuid: string
          name: string
          raw_json?: Json | null
          release_date?: string | null
          set_code?: string | null
          tcg_is_verified?: boolean
          tcgplayer_product_id?: number | null
          type: string
          upc?: string | null
          upc_is_verified?: boolean
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          language?: string | null
          mtgjson_uuid?: string
          name?: string
          raw_json?: Json | null
          release_date?: string | null
          set_code?: string | null
          tcg_is_verified?: boolean
          tcgplayer_product_id?: number | null
          type?: string
          upc?: string | null
          upc_is_verified?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      upc_candidates: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          scraped_name: string | null
          scraped_upc: string | null
          wpn_url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          scraped_name?: string | null
          scraped_upc?: string | null
          wpn_url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          scraped_name?: string | null
          scraped_upc?: string | null
          wpn_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upc_candidates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upc_candidates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vw_unmapped_products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vw_unmapped_products: {
        Row: {
          id: string | null
          name: string | null
          set_code: string | null
          type: string | null
        }
        Insert: {
          id?: string | null
          name?: string | null
          set_code?: string | null
          type?: string | null
        }
        Update: {
          id?: string | null
          name?: string | null
          set_code?: string | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      import_mtgjson_products: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
