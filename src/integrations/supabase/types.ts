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
      accesses: {
        Row: {
          access_type: string
          created_at: string
          drive_folder_id: string | null
          drive_folder_name: string | null
          drive_permission_id: string | null
          email: string
          expires_at: string | null
          granted_at: string
          id: string
          seconds_remaining: number | null
          status: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          access_type?: string
          created_at?: string
          drive_folder_id?: string | null
          drive_folder_name?: string | null
          drive_permission_id?: string | null
          email: string
          expires_at?: string | null
          granted_at?: string
          id?: string
          seconds_remaining?: number | null
          status?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          access_type?: string
          created_at?: string
          drive_folder_id?: string | null
          drive_folder_name?: string | null
          drive_permission_id?: string | null
          email?: string
          expires_at?: string | null
          granted_at?: string
          id?: string
          seconds_remaining?: number | null
          status?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      buyers: {
        Row: {
          access_granted: boolean | null
          amount: number | null
          created_at: string
          email: string
          email_sent: boolean | null
          external_reference: string | null
          id: string
          name: string | null
          payment_id: string | null
          payment_method: string | null
          plan: string
          status: string
          updated_at: string
          upsell_purchased: boolean | null
          upsell2_purchased: boolean | null
          whatsapp: string | null
        }
        Insert: {
          access_granted?: boolean | null
          amount?: number | null
          created_at?: string
          email: string
          email_sent?: boolean | null
          external_reference?: string | null
          id?: string
          name?: string | null
          payment_id?: string | null
          payment_method?: string | null
          plan?: string
          status?: string
          updated_at?: string
          upsell_purchased?: boolean | null
          upsell2_purchased?: boolean | null
          whatsapp?: string | null
        }
        Update: {
          access_granted?: boolean | null
          amount?: number | null
          created_at?: string
          email?: string
          email_sent?: boolean | null
          external_reference?: string | null
          id?: string
          name?: string | null
          payment_id?: string | null
          payment_method?: string | null
          plan?: string
          status?: string
          updated_at?: string
          upsell_purchased?: boolean | null
          upsell2_purchased?: boolean | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      coupons: {
        Row: {
          active: boolean | null
          code: string
          created_at: string
          description: string | null
          discount_percent: number
          expires_at: string | null
          id: string
          max_uses: number | null
          times_used: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          code: string
          created_at?: string
          description?: string | null
          discount_percent: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          times_used?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          code?: string
          created_at?: string
          description?: string | null
          discount_percent?: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          times_used?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      drive_config: {
        Row: {
          access_token: string | null
          connected: boolean | null
          folder_id: string | null
          folder_name: string | null
          id: string
          refresh_token: string | null
          token_expiry: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          connected?: boolean | null
          folder_id?: string | null
          folder_name?: string | null
          id?: string
          refresh_token?: string | null
          token_expiry?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          connected?: boolean | null
          folder_id?: string | null
          folder_name?: string | null
          id?: string
          refresh_token?: string | null
          token_expiry?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_followups: {
        Row: {
          email: string
          id: string
          sent_at: string
          type: string
        }
        Insert: {
          email: string
          id?: string
          sent_at?: string
          type: string
        }
        Update: {
          email?: string
          id?: string
          sent_at?: string
          type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          updated_at?: string
          user_id?: string
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
      courses: {
        Row: {
          active: boolean
          category: string
          cover_image_url: string | null
          cover_source: string
          created_at: string
          description: string | null
          drive_folder_id: string
          id: string
          lesson_count: number
          material_count: number
          slug: string
          sort_order: number
          synced_at: string | null
          title: string
          total_duration_seconds: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string
          cover_image_url?: string | null
          cover_source?: string
          created_at?: string
          description?: string | null
          drive_folder_id: string
          id?: string
          lesson_count?: number
          material_count?: number
          slug: string
          sort_order?: number
          synced_at?: string | null
          title: string
          total_duration_seconds?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          cover_image_url?: string | null
          cover_source?: string
          created_at?: string
          description?: string | null
          drive_folder_id?: string
          id?: string
          lesson_count?: number
          material_count?: number
          slug?: string
          sort_order?: number
          synced_at?: string | null
          title?: string
          total_duration_seconds?: number
          updated_at?: string
        }
        Relationships: []
      }
      course_modules: {
        Row: {
          course_id: string
          created_at: string
          drive_folder_id: string
          id: string
          sort_order: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          drive_folder_id: string
          id?: string
          sort_order?: number
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          drive_folder_id?: string
          id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          course_id: string
          created_at: string
          drive_file_id: string
          duration_seconds: number | null
          id: string
          mime_type: string | null
          module_id: string | null
          size_bytes: number | null
          sort_order: number
          title: string
          type: string
        }
        Insert: {
          course_id: string
          created_at?: string
          drive_file_id: string
          duration_seconds?: number | null
          id?: string
          mime_type?: string | null
          module_id?: string | null
          size_bytes?: number | null
          sort_order?: number
          title: string
          type?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          drive_file_id?: string
          duration_seconds?: number | null
          id?: string
          mime_type?: string | null
          module_id?: string | null
          size_bytes?: number | null
          sort_order?: number
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed: boolean
          course_id: string
          id: string
          last_watched_at: string
          lesson_id: string
          user_id: string
          watched_seconds: number
        }
        Insert: {
          completed?: boolean
          course_id: string
          id?: string
          last_watched_at?: string
          lesson_id: string
          user_id: string
          watched_seconds?: number
        }
        Update: {
          completed?: boolean
          course_id?: string
          id?: string
          last_watched_at?: string
          lesson_id?: string
          user_id?: string
          watched_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      course_comments: {
        Row: {
          body: string
          course_id: string | null
          created_at: string
          id: string
          lesson_id: string | null
          parent_id: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          course_id?: string | null
          created_at?: string
          id?: string
          lesson_id?: string | null
          parent_id?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          course_id?: string | null
          created_at?: string
          id?: string
          lesson_id?: string | null
          parent_id?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_comments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_comments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "course_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      visits: {
        Row: {
          created_at: string
          id: string
          ip: string | null
          page: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip?: string | null
          page?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip?: string | null
          page?: string | null
          user_agent?: string | null
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
      is_member: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
