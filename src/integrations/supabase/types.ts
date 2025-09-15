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
      approvals: {
        Row: {
          comment: string | null
          decided_at: string
          id: string
          reviewer_id: string
          reviewer_signature_url: string | null
          status: Database["public"]["Enums"]["transport_status"]
          transport_id: string
        }
        Insert: {
          comment?: string | null
          decided_at?: string
          id?: string
          reviewer_id: string
          reviewer_signature_url?: string | null
          status: Database["public"]["Enums"]["transport_status"]
          transport_id: string
        }
        Update: {
          comment?: string | null
          decided_at?: string
          id?: string
          reviewer_id?: string
          reviewer_signature_url?: string | null
          status?: Database["public"]["Enums"]["transport_status"]
          transport_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approvals_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "org_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_transport_id_fkey"
            columns: ["transport_id"]
            isOneToOne: false
            referencedRelation: "transports"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          after_json: Json | null
          at: string
          before_json: Json | null
          entity: string
          entity_id: string
          id: string
          org_id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          after_json?: Json | null
          at?: string
          before_json?: Json | null
          entity: string
          entity_id: string
          id?: string
          org_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          after_json?: Json | null
          at?: string
          before_json?: Json | null
          entity?: string
          entity_id?: string
          id?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
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
        ]
      }
      export_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          file_path: string | null
          id: string
          kind: Database["public"]["Enums"]["export_type"]
          org_id: string
          params: Json
          requested_by: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          file_path?: string | null
          id?: string
          kind: Database["public"]["Enums"]["export_type"]
          org_id: string
          params: Json
          requested_by?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          file_path?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["export_type"]
          org_id?: string
          params?: Json
          requested_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "export_jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "export_jobs_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "org_users"
            referencedColumns: ["id"]
          },
        ]
      }
      facilities: {
        Row: {
          address: string | null
          created_at: string
          id: string
          kind: string | null
          lat: number | null
          lng: number | null
          name: string
          org_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          kind?: string | null
          lat?: number | null
          lng?: number | null
          name: string
          org_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          kind?: string | null
          lat?: number | null
          lng?: number | null
          name?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "facilities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_photos: {
        Row: {
          created_at: string
          id: string
          inspection_id: string
          label: string | null
          storage_key: string
        }
        Insert: {
          created_at?: string
          id?: string
          inspection_id: string
          label?: string | null
          storage_key: string
        }
        Update: {
          created_at?: string
          id?: string
          inspection_id?: string
          label?: string | null
          storage_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_photos_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "vehicle_inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_templates: {
        Row: {
          active: boolean
          created_at: string
          frequency: Database["public"]["Enums"]["inspection_frequency"]
          id: string
          name: string
          org_id: string
          schema: Json
        }
        Insert: {
          active?: boolean
          created_at?: string
          frequency?: Database["public"]["Enums"]["inspection_frequency"]
          id?: string
          name: string
          org_id: string
          schema?: Json
        }
        Update: {
          active?: boolean
          created_at?: string
          frequency?: Database["public"]["Enums"]["inspection_frequency"]
          id?: string
          name?: string
          org_id?: string
          schema?: Json
        }
        Relationships: [
          {
            foreignKeyName: "inspection_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      legs: {
        Row: {
          allocations: Json
          billable_distance_miles: number
          distance_miles: number
          from_seq: number
          id: string
          needs_review: boolean
          to_seq: number
          transport_id: string
          user_ids: string[]
        }
        Insert: {
          allocations?: Json
          billable_distance_miles: number
          distance_miles: number
          from_seq: number
          id?: string
          needs_review?: boolean
          to_seq: number
          transport_id: string
          user_ids?: string[]
        }
        Update: {
          allocations?: Json
          billable_distance_miles?: number
          distance_miles?: number
          from_seq?: number
          id?: string
          needs_review?: boolean
          to_seq?: number
          transport_id?: string
          user_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "legs_transport_id_fkey"
            columns: ["transport_id"]
            isOneToOne: false
            referencedRelation: "transports"
            referencedColumns: ["id"]
          },
        ]
      }
      org_invitations: {
        Row: {
          accepted_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          org_id: string
          roles: Database["public"]["Enums"]["user_role"][]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          email: string
          expires_at: string
          id?: string
          invited_by?: string | null
          org_id: string
          roles: Database["public"]["Enums"]["user_role"][]
          token: string
        }
        Update: {
          accepted_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          org_id?: string
          roles?: Database["public"]["Enums"]["user_role"][]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "org_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_users: {
        Row: {
          active: boolean
          auth_user_id: string | null
          bill_type: string | null
          created_at: string
          email: string | null
          facility_id: string | null
          full_name: string
          id: string
          org_id: string
          phone: string | null
          title: string | null
        }
        Insert: {
          active?: boolean
          auth_user_id?: string | null
          bill_type?: string | null
          created_at?: string
          email?: string | null
          facility_id?: string | null
          full_name: string
          id?: string
          org_id: string
          phone?: string | null
          title?: string | null
        }
        Update: {
          active?: boolean
          auth_user_id?: string | null
          bill_type?: string | null
          created_at?: string
          email?: string | null
          facility_id?: string | null
          full_name?: string
          id?: string
          org_id?: string
          phone?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_users_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_users_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          settings: Json
          timezone: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          settings?: Json
          timezone?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          settings?: Json
          timezone?: string | null
        }
        Relationships: []
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
      rider_trips: {
        Row: {
          alight_seq: number
          board_seq: number
          distance_miles: number
          end_odo: number
          end_ts: string
          id: string
          needs_review: boolean
          org_id: string
          rider_id: string
          start_odo: number
          start_ts: string
          transport_id: string
        }
        Insert: {
          alight_seq: number
          board_seq: number
          distance_miles: number
          end_odo: number
          end_ts: string
          id?: string
          needs_review?: boolean
          org_id: string
          rider_id: string
          start_odo: number
          start_ts: string
          transport_id: string
        }
        Update: {
          alight_seq?: number
          board_seq?: number
          distance_miles?: number
          end_odo?: number
          end_ts?: string
          id?: string
          needs_review?: boolean
          org_id?: string
          rider_id?: string
          start_odo?: number
          start_ts?: string
          transport_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rider_trips_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rider_trips_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "org_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rider_trips_transport_id_fkey"
            columns: ["transport_id"]
            isOneToOne: false
            referencedRelation: "transports"
            referencedColumns: ["id"]
          },
        ]
      }
      stops: {
        Row: {
          disembark_user_ids: string[]
          embark_user_ids: string[]
          id: string
          lat: number | null
          lng: number | null
          notes: string | null
          odometer: number
          seq: number
          transport_id: string
          ts: string
        }
        Insert: {
          disembark_user_ids?: string[]
          embark_user_ids?: string[]
          id?: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          odometer: number
          seq: number
          transport_id: string
          ts?: string
        }
        Update: {
          disembark_user_ids?: string[]
          embark_user_ids?: string[]
          id?: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          odometer?: number
          seq?: number
          transport_id?: string
          ts?: string
        }
        Relationships: [
          {
            foreignKeyName: "stops_transport_id_fkey"
            columns: ["transport_id"]
            isOneToOne: false
            referencedRelation: "transports"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_rider_reasons: {
        Row: {
          id: string
          reason: string
          transport_id: string
          user_id: string
        }
        Insert: {
          id?: string
          reason: string
          transport_id: string
          user_id: string
        }
        Update: {
          id?: string
          reason?: string
          transport_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_rider_reasons_transport_id_fkey"
            columns: ["transport_id"]
            isOneToOne: false
            referencedRelation: "transports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_rider_reasons_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users"
            referencedColumns: ["id"]
          },
        ]
      }
      transports: {
        Row: {
          billed_at: string | null
          billed_by: string | null
          created_at: string
          driver_id: string
          driver_signature_url: string | null
          end_lat: number | null
          end_lng: number | null
          end_odo: number | null
          ended_at: string | null
          id: string
          notes: string | null
          org_id: string
          start_lat: number | null
          start_lng: number | null
          start_odo: number | null
          started_at: string
          status: Database["public"]["Enums"]["transport_status"]
          vehicle_id: string
        }
        Insert: {
          billed_at?: string | null
          billed_by?: string | null
          created_at?: string
          driver_id: string
          driver_signature_url?: string | null
          end_lat?: number | null
          end_lng?: number | null
          end_odo?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          org_id: string
          start_lat?: number | null
          start_lng?: number | null
          start_odo?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["transport_status"]
          vehicle_id: string
        }
        Update: {
          billed_at?: string | null
          billed_by?: string | null
          created_at?: string
          driver_id?: string
          driver_signature_url?: string | null
          end_lat?: number | null
          end_lng?: number | null
          end_odo?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          start_lat?: number | null
          start_lng?: number | null
          start_odo?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["transport_status"]
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transports_billed_by_fkey"
            columns: ["billed_by"]
            isOneToOne: false
            referencedRelation: "org_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transports_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "org_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transports_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
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
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "org_users"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_inspections: {
        Row: {
          answers: Json
          created_at: string
          driver_id: string
          for_date: string
          for_transport_id: string | null
          id: string
          notes: string | null
          org_id: string
          status: Database["public"]["Enums"]["inspection_status"]
          template_id: string
          vehicle_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          driver_id: string
          for_date?: string
          for_transport_id?: string | null
          id?: string
          notes?: string | null
          org_id: string
          status?: Database["public"]["Enums"]["inspection_status"]
          template_id: string
          vehicle_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          driver_id?: string
          for_date?: string
          for_transport_id?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          status?: Database["public"]["Enums"]["inspection_status"]
          template_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_inspections_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "org_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_inspections_for_transport_id_fkey"
            columns: ["for_transport_id"]
            isOneToOne: false
            referencedRelation: "transports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_inspections_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_inspections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "inspection_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_inspections_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          active: boolean
          ada_features: string | null
          capacity: number | null
          category: string
          created_at: string
          id: string
          label: string
          last_known_mileage: number | null
          org_id: string
          plate: string | null
          pretrip_required: boolean
          pretrip_template_id: string | null
          vin: string | null
        }
        Insert: {
          active?: boolean
          ada_features?: string | null
          capacity?: number | null
          category: string
          created_at?: string
          id?: string
          label: string
          last_known_mileage?: number | null
          org_id: string
          plate?: string | null
          pretrip_required?: boolean
          pretrip_template_id?: string | null
          vin?: string | null
        }
        Update: {
          active?: boolean
          ada_features?: string | null
          capacity?: number | null
          category?: string
          created_at?: string
          id?: string
          label?: string
          last_known_mileage?: number | null
          org_id?: string
          plate?: string | null
          pretrip_required?: boolean
          pretrip_template_id?: string | null
          vin?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_pretrip_template_id_fkey"
            columns: ["pretrip_template_id"]
            isOneToOne: false
            referencedRelation: "inspection_templates"
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
      current_org_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      derived_org_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      has_role: {
        Args: { r: Database["public"]["Enums"]["user_role"] }
        Returns: boolean
      }
      import_mtgjson_products: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      jwt_org_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      recalculate_transport_derived: {
        Args: { p_transport: string }
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
