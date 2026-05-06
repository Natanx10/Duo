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
      categories: {
        Row: {
          color: string
          couple_id: string | null
          created_at: string
          icon: string
          id: string
          is_shared: boolean
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          couple_id?: string | null
          created_at?: string
          icon?: string
          id?: string
          is_shared?: boolean
          name: string
          user_id: string
        }
        Update: {
          color?: string
          couple_id?: string | null
          created_at?: string
          icon?: string
          id?: string
          is_shared?: boolean
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      couples: {
        Row: {
          created_at: string
          created_by: string
          id: string
          invite_code: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          invite_code: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          invite_code?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          category_id: string | null
          couple_id: string | null
          created_at: string
          description: string | null
          ends_at: string
          id: string
          is_shared: boolean
          location: string | null
          priority: number
          starts_at: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          couple_id?: string | null
          created_at?: string
          description?: string | null
          ends_at: string
          id?: string
          is_shared?: boolean
          location?: string | null
          priority?: number
          starts_at: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          couple_id?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string
          id?: string
          is_shared?: boolean
          location?: string | null
          priority?: number
          starts_at?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_checkins: {
        Row: {
          checkin_date: string
          count: number
          created_at: string
          habit_id: string
          id: string
          note: string | null
          user_id: string
        }
        Insert: {
          checkin_date: string
          count?: number
          created_at?: string
          habit_id: string
          id?: string
          note?: string | null
          user_id: string
        }
        Update: {
          checkin_date?: string
          count?: number
          created_at?: string
          habit_id?: string
          id?: string
          note?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_checkins_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          color: string
          couple_id: string | null
          created_at: string
          days_of_week: number[]
          description: string | null
          icon: string
          id: string
          is_active: boolean
          is_shared: boolean
          target_per_day: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          couple_id?: string | null
          created_at?: string
          days_of_week?: number[]
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          is_shared?: boolean
          target_per_day?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          couple_id?: string | null
          created_at?: string
          days_of_week?: number[]
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          is_shared?: boolean
          target_per_day?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          color: string
          couple_id: string | null
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          color?: string
          couple_id?: string | null
          created_at?: string
          display_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          color?: string
          couple_id?: string | null
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          created_at: string
          days_of_week: number[] | null
          event_id: string | null
          habit_id: string | null
          id: string
          is_active: boolean
          remind_at: string | null
          remind_time: string | null
          routine_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          days_of_week?: number[] | null
          event_id?: string | null
          habit_id?: string | null
          id?: string
          is_active?: boolean
          remind_at?: string | null
          remind_time?: string | null
          routine_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          days_of_week?: number[] | null
          event_id?: string | null
          habit_id?: string | null
          id?: string
          is_active?: boolean
          remind_at?: string | null
          remind_time?: string | null
          routine_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_exceptions: {
        Row: {
          created_at: string
          exception_date: string
          id: string
          routine_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exception_date: string
          id?: string
          routine_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          exception_date?: string
          id?: string
          routine_id?: string
          user_id?: string
        }
        Relationships: []
      }
      routines: {
        Row: {
          category_id: string | null
          color: string
          couple_id: string | null
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_shared: boolean
          start_time: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          color?: string
          couple_id?: string | null
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_shared?: boolean
          start_time: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          color?: string
          couple_id?: string | null
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_shared?: boolean
          start_time?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routines_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routines_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      todos: {
        Row: {
          category_id: string | null
          completed_at: string | null
          couple_id: string | null
          created_at: string
          description: string | null
          due_at: string | null
          duration_minutes: number
          id: string
          is_completed: boolean
          is_shared: boolean
          priority: number
          show_in_calendar: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          completed_at?: string | null
          couple_id?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          duration_minutes?: number
          id?: string
          is_completed?: boolean
          is_shared?: boolean
          priority?: number
          show_in_calendar?: boolean
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          completed_at?: string | null
          couple_id?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          duration_minutes?: number
          id?: string
          is_completed?: boolean
          is_shared?: boolean
          priority?: number
          show_in_calendar?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "todos_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_couple_id: { Args: { _user_id: string }; Returns: string }
      join_couple_by_code: { Args: { _code: string }; Returns: string }
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
