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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      cards: {
        Row: {
          card_number: string | null
          condition: Database["public"]["Enums"]["card_condition"]
          created_at: string
          description: string | null
          featured: boolean
          id: string
          photo_paths: string[]
          price_cad: number
          quantity: number
          rarity: string | null
          set_name: string | null
          slug: string
          status: Database["public"]["Enums"]["card_status"]
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          card_number?: string | null
          condition?: Database["public"]["Enums"]["card_condition"]
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          photo_paths?: string[]
          price_cad: number
          quantity?: number
          rarity?: string | null
          set_name?: string | null
          slug: string
          status?: Database["public"]["Enums"]["card_status"]
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          card_number?: string | null
          condition?: Database["public"]["Enums"]["card_condition"]
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          photo_paths?: string[]
          price_cad?: number
          quantity?: number
          rarity?: string | null
          set_name?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["card_status"]
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          card_id: string
          created_at: string
          id: string
          quantity: number
          user_id: string
        }
        Insert: {
          card_id: string
          created_at?: string
          id?: string
          quantity?: number
          user_id: string
        }
        Update: {
          card_id?: string
          created_at?: string
          id?: string
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          card_id: string
          id: string
          order_id: string
          price_snapshot: number
          quantity: number
          title_snapshot: string
        }
        Insert: {
          card_id: string
          id?: string
          order_id: string
          price_snapshot: number
          quantity?: number
          title_snapshot: string
        }
        Update: {
          card_id?: string
          id?: string
          order_id?: string
          price_snapshot?: number
          quantity?: number
          title_snapshot?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_email: string
          buyer_id: string | null
          buyer_name: string
          buyer_phone: string
          created_at: string
          etransfer_reference: string | null
          fulfillment_status: Database["public"]["Enums"]["fulfillment_status"]
          fulfillment_type: Database["public"]["Enums"]["fulfillment_type"]
          id: string
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          shipping_address: Json | null
          shipping_fee_cad: number
          shipping_method: Database["public"]["Enums"]["shipping_method"] | null
          subtotal_cad: number
          total_cad: number
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          buyer_email: string
          buyer_id?: string | null
          buyer_name: string
          buyer_phone: string
          created_at?: string
          etransfer_reference?: string | null
          fulfillment_status?: Database["public"]["Enums"]["fulfillment_status"]
          fulfillment_type: Database["public"]["Enums"]["fulfillment_type"]
          id?: string
          order_number: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          shipping_address?: Json | null
          shipping_fee_cad?: number
          shipping_method?:
            | Database["public"]["Enums"]["shipping_method"]
            | null
          subtotal_cad: number
          total_cad: number
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          buyer_email?: string
          buyer_id?: string | null
          buyer_name?: string
          buyer_phone?: string
          created_at?: string
          etransfer_reference?: string | null
          fulfillment_status?: Database["public"]["Enums"]["fulfillment_status"]
          fulfillment_type?: Database["public"]["Enums"]["fulfillment_type"]
          id?: string
          order_number?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          shipping_address?: Json | null
          shipping_fee_cad?: number
          shipping_method?:
            | Database["public"]["Enums"]["shipping_method"]
            | null
          subtotal_cad?: number
          total_cad?: number
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      reservations: {
        Row: {
          buyer_email: string
          buyer_name: string
          buyer_phone: string
          card_id: string
          expires_at: string
          id: string
          notes: string | null
          reserved_at: string
          status: Database["public"]["Enums"]["reservation_status"]
        }
        Insert: {
          buyer_email: string
          buyer_name: string
          buyer_phone: string
          card_id: string
          expires_at: string
          id?: string
          notes?: string | null
          reserved_at?: string
          status?: Database["public"]["Enums"]["reservation_status"]
        }
        Update: {
          buyer_email?: string
          buyer_name?: string
          buyer_phone?: string
          card_id?: string
          expires_at?: string
          id?: string
          notes?: string | null
          reserved_at?: string
          status?: Database["public"]["Enums"]["reservation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "reservations_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          contact_email: string
          etransfer_email: string
          etransfer_instructions: string
          id: number
          pickup_hours: string
          pickup_location_label: string
          reservation_hold_hours: number
          tracked_shipping_fee_cad: number
          untracked_shipping_fee_cad: number
        }
        Insert: {
          contact_email?: string
          etransfer_email?: string
          etransfer_instructions?: string
          id?: number
          pickup_hours?: string
          pickup_location_label?: string
          reservation_hold_hours?: number
          tracked_shipping_fee_cad?: number
          untracked_shipping_fee_cad?: number
        }
        Update: {
          contact_email?: string
          etransfer_email?: string
          etransfer_instructions?: string
          id?: number
          pickup_hours?: string
          pickup_location_label?: string
          reservation_hold_hours?: number
          tracked_shipping_fee_cad?: number
          untracked_shipping_fee_cad?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_manager: { Args: never; Returns: boolean }
    }
    Enums: {
      card_condition: "NM" | "LP" | "MP" | "HP" | "DMG"
      card_status: "available" | "reserved" | "sold" | "draft"
      fulfillment_status:
        | "pending"
        | "ready_for_pickup"
        | "shipped"
        | "completed"
        | "cancelled"
      fulfillment_type: "pickup" | "ship"
      payment_method: "etransfer" | "cash_on_pickup"
      payment_status: "awaiting_transfer" | "received" | "refunded"
      reservation_status:
        | "pending"
        | "confirmed"
        | "picked_up"
        | "cancelled"
        | "expired"
      shipping_method: "untracked" | "tracked"
      user_role: "manager" | "buyer"
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
      card_condition: ["NM", "LP", "MP", "HP", "DMG"],
      card_status: ["available", "reserved", "sold", "draft"],
      fulfillment_status: [
        "pending",
        "ready_for_pickup",
        "shipped",
        "completed",
        "cancelled",
      ],
      fulfillment_type: ["pickup", "ship"],
      payment_method: ["etransfer", "cash_on_pickup"],
      payment_status: ["awaiting_transfer", "received", "refunded"],
      reservation_status: [
        "pending",
        "confirmed",
        "picked_up",
        "cancelled",
        "expired",
      ],
      shipping_method: ["untracked", "tracked"],
      user_role: ["manager", "buyer"],
    },
  },
} as const
