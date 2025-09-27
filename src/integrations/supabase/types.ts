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
          user_id: string
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
          user_id: string
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
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_metrics_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
          user_id: string
        }
        Insert: {
          contained_name: string
          created_at?: string
          id?: string
          product_id: string
          quantity?: number | null
          rarity?: string | null
          user_id: string
        }
        Update: {
          contained_name?: string
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number | null
          rarity?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_contents_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
          user_id: string
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
          user_id: string
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
          user_id?: string
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
          user_id: string
          wpn_url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          scraped_name?: string | null
          scraped_upc?: string | null
          user_id: string
          wpn_url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          scraped_name?: string | null
          scraped_upc?: string | null
          user_id?: string
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
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_legs: {
        Args: { p_transport: string }
        Returns: undefined
      }
      calculate_rider_trips: {
        Args: { p_transport: string }
        Returns: undefined
      }
      check_product_exists: {
        Args: { p_mtgjson_uuid: string; p_user_id: string }
        Returns: {
          id: string
          user_id: string
        }[]
      }
      current_org_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      daitch_mokotoff: {
        Args: { "": string }
        Returns: string[]
      }
      derived_org_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      dmetaphone: {
        Args: { "": string }
        Returns: string
      }
      dmetaphone_alt: {
        Args: { "": string }
        Returns: string
      }
      find_best_product_match: {
        Args: { p_scraped_name: string; p_set_code: string }
        Returns: {
          id: string
          name: string
          set_code: string
          sim: number
        }[]
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      has_role: {
        Args: { r: Database["public"]["Enums"]["user_role"] }
        Returns: boolean
      }
      import_mtgjson_products: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      insert_product: {
        Args: {
          p_active: boolean
          p_language: string
          p_mtgjson_uuid: string
          p_name: string
          p_raw_json: Json
          p_release_date: string
          p_set_code: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      jwt_org_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      recalculate_transport_derived: {
        Args: { p_transport: string }
        Returns: undefined
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      soundex: {
        Args: { "": string }
        Returns: string
      }
      text_soundex: {
        Args: { "": string }
        Returns: string
      }
      update_product: {
        Args: {
          p_active: boolean
          p_id: string
          p_language: string
          p_mtgjson_uuid: string
          p_name: string
          p_raw_json: Json
          p_release_date: string
          p_set_code: string
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      export_type: "csv" | "pdf"
      inspection_frequency: "per_trip" | "daily"
      inspection_status: "incomplete" | "passed" | "failed"
      transport_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "approved"
        | "rejected"
        | "billed"
      user_role: "rider" | "driver" | "coordinator" | "billing" | "admin"
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
    Enums: {
      export_type: ["csv", "pdf"],
      inspection_frequency: ["per_trip", "daily"],
      inspection_status: ["incomplete", "passed", "failed"],
      transport_status: [
        "draft",
        "submitted",
        "under_review",
        "approved",
        "rejected",
        "billed",
      ],
      user_role: ["rider", "driver", "coordinator", "billing", "admin"],
    },
  },
} as const
