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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      bot_sessions: {
        Row: {
          data: Json
          phone: string
          updated_at: string
        }
        Insert: {
          data?: Json
          phone: string
          updated_at?: string
        }
        Update: {
          data?: Json
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      button_locks: {
        Row: {
          choice: string | null
          context_id: string
          created_at: string
          phone: string | null
        }
        Insert: {
          choice?: string | null
          context_id: string
          created_at?: string
          phone?: string | null
        }
        Update: {
          choice?: string | null
          context_id?: string
          created_at?: string
          phone?: string | null
        }
        Relationships: []
      }
      catalog_items: {
        Row: {
          code: string
          name: string
          price: number | null
          specs: Json
          unit: string | null
          updated_at: string
        }
        Insert: {
          code: string
          name: string
          price?: number | null
          specs?: Json
          unit?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          name?: string
          price?: number | null
          specs?: Json
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          bot_paused: boolean
          city: string | null
          created_at: string
          last_at: string
          last_message: string | null
          name: string | null
          phone: string
          stage: string | null
          status: string
          system: string | null
        }
        Insert: {
          bot_paused?: boolean
          city?: string | null
          created_at?: string
          last_at?: string
          last_message?: string | null
          name?: string | null
          phone: string
          stage?: string | null
          status?: string
          system?: string | null
        }
        Update: {
          bot_paused?: boolean
          city?: string | null
          created_at?: string
          last_at?: string
          last_message?: string | null
          name?: string | null
          phone?: string
          stage?: string | null
          status?: string
          system?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          created_at: string
          direction: string
          file_name: string | null
          id: string
          kind: string
          media_id: string | null
          mime: string | null
          phone: string
          stage: string | null
          text: string | null
        }
        Insert: {
          created_at?: string
          direction?: string
          file_name?: string | null
          id?: string
          kind?: string
          media_id?: string | null
          mime?: string | null
          phone: string
          stage?: string | null
          text?: string | null
        }
        Update: {
          created_at?: string
          direction?: string
          file_name?: string | null
          id?: string
          kind?: string
          media_id?: string | null
          mime?: string | null
          phone?: string
          stage?: string | null
          text?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount: string | null
          city: string | null
          created_at: string
          details: string | null
          id: string
          invoice_no: string | null
          method: string | null
          name: string | null
          phone: string
          status: string
        }
        Insert: {
          amount?: string | null
          city?: string | null
          created_at?: string
          details?: string | null
          id?: string
          invoice_no?: string | null
          method?: string | null
          name?: string | null
          phone: string
          status?: string
        }
        Update: {
          amount?: string | null
          city?: string | null
          created_at?: string
          details?: string | null
          id?: string
          invoice_no?: string | null
          method?: string | null
          name?: string | null
          phone?: string
          status?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          email: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tickets: {
        Row: {
          city: string | null
          created_at: string
          description: string | null
          device: string | null
          id: string
          issue_type: string | null
          media_id: string | null
          media_type: string | null
          name: string | null
          phone: string
          status: string
          ticket_no: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          description?: string | null
          device?: string | null
          id?: string
          issue_type?: string | null
          media_id?: string | null
          media_type?: string | null
          name?: string | null
          phone: string
          status?: string
          ticket_no: string
        }
        Update: {
          city?: string | null
          created_at?: string
          description?: string | null
          device?: string | null
          id?: string
          issue_type?: string | null
          media_id?: string | null
          media_type?: string | null
          name?: string | null
          phone?: string
          status?: string
          ticket_no?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_team: { Args: { _user_id: string }; Returns: boolean }
      next_ticket_no: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "admin" | "staff"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "staff"],
    },
  },
} as const
