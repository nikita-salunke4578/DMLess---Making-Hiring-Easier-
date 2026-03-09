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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      candidate_submissions: {
        Row: {
          answers: Json
          candidate_email: string
          candidate_name: string
          completed_at: string | null
          hiring_link_id: string
          id: string
          knocked_out: boolean
          knockout_reason: string | null
          resume_url: string | null
          score: number
          started_at: string
          status: string
          tab_switch_count: number
          total_questions: number
          video_intro_url: string | null
        }
        Insert: {
          answers?: Json
          candidate_email: string
          candidate_name: string
          completed_at?: string | null
          hiring_link_id: string
          id?: string
          knocked_out?: boolean
          knockout_reason?: string | null
          resume_url?: string | null
          score?: number
          started_at?: string
          status?: string
          tab_switch_count?: number
          total_questions?: number
          video_intro_url?: string | null
        }
        Update: {
          answers?: Json
          candidate_email?: string
          candidate_name?: string
          completed_at?: string | null
          hiring_link_id?: string
          id?: string
          knocked_out?: boolean
          knockout_reason?: string | null
          resume_url?: string | null
          score?: number
          started_at?: string
          status?: string
          tab_switch_count?: number
          total_questions?: number
          video_intro_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_submissions_hiring_link_id_fkey"
            columns: ["hiring_link_id"]
            isOneToOne: false
            referencedRelation: "hiring_links"
            referencedColumns: ["id"]
          },
        ]
      }
      hiring_links: {
        Row: {
          company_logo_url: string | null
          company_name: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          max_tab_switches: number
          passing_score: number
          recruiter_id: string
          slug: string
          time_limit_minutes: number
          title: string
          updated_at: string
        }
        Insert: {
          company_logo_url?: string | null
          company_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_tab_switches?: number
          passing_score?: number
          recruiter_id: string
          slug: string
          time_limit_minutes?: number
          title: string
          updated_at?: string
        }
        Update: {
          company_logo_url?: string | null
          company_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_tab_switches?: number
          passing_score?: number
          recruiter_id?: string
          slug?: string
          time_limit_minutes?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          created_at: string
          display_name: string | null
          id: string
          industry: string | null
          logo_url: string | null
          notification_email: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          notification_email?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          notification_email?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          correct_option: number
          created_at: string
          hiring_link_id: string
          id: string
          is_knockout: boolean
          options: Json
          question_text: string
          sort_order: number
        }
        Insert: {
          correct_option: number
          created_at?: string
          hiring_link_id: string
          id?: string
          is_knockout?: boolean
          options?: Json
          question_text: string
          sort_order?: number
        }
        Update: {
          correct_option?: number
          created_at?: string
          hiring_link_id?: string
          id?: string
          is_knockout?: boolean
          options?: Json
          question_text?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "questions_hiring_link_id_fkey"
            columns: ["hiring_link_id"]
            isOneToOne: false
            referencedRelation: "hiring_links"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
