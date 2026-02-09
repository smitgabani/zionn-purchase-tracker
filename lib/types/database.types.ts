export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      employees: {
        Row: {
          id: string
          admin_user_id: string
          name: string
          email: string | null
          department: string | null
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          admin_user_id: string
          name: string
          email?: string | null
          department?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          admin_user_id?: string
          name?: string
          email?: string | null
          department?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      cards: {
        Row: {
          id: string
          admin_user_id: string
          last_four: string
          bank_name: string
          card_type: string | null
          nickname: string | null
          employee_id: string | null
          is_shared: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          admin_user_id: string
          last_four: string
          bank_name: string
          card_type?: string | null
          nickname?: string | null
          employee_id?: string | null
          is_shared?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          admin_user_id?: string
          last_four?: string
          bank_name?: string
          card_type?: string | null
          nickname?: string | null
          employee_id?: string | null
          is_shared?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          admin_user_id: string
          name: string
          color: string
          icon: string | null
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          admin_user_id: string
          name: string
          color?: string
          icon?: string | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          admin_user_id?: string
          name?: string
          color?: string
          icon?: string | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      parsing_rules: {
        Row: {
          id: string
          admin_user_id: string
          name: string
          description: string | null
          is_active: boolean
          priority: number
          sender_pattern: string | null
          subject_pattern: string | null
          body_pattern: string | null
          amount_pattern: string
          merchant_pattern: string | null
          date_pattern: string | null
          card_last_four_pattern: string | null
          date_format: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          admin_user_id: string
          name: string
          description?: string | null
          is_active?: boolean
          priority?: number
          sender_pattern?: string | null
          subject_pattern?: string | null
          body_pattern?: string | null
          amount_pattern: string
          merchant_pattern?: string | null
          date_pattern?: string | null
          card_last_four_pattern?: string | null
          date_format?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          admin_user_id?: string
          name?: string
          description?: string | null
          is_active?: boolean
          priority?: number
          sender_pattern?: string | null
          subject_pattern?: string | null
          body_pattern?: string | null
          amount_pattern?: string
          merchant_pattern?: string | null
          date_pattern?: string | null
          card_last_four_pattern?: string | null
          date_format?: string
          created_at?: string
          updated_at?: string
        }
      }
      raw_emails: {
        Row: {
          id: string
          admin_user_id: string
          gmail_message_id: string
          sender: string | null
          subject: string | null
          body: string | null
          received_at: string | null
          parsed: boolean
          parse_error: string | null
          parsing_rule_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          admin_user_id: string
          gmail_message_id: string
          sender?: string | null
          subject?: string | null
          body?: string | null
          received_at?: string | null
          parsed?: boolean
          parse_error?: string | null
          parsing_rule_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          admin_user_id?: string
          gmail_message_id?: string
          sender?: string | null
          subject?: string | null
          body?: string | null
          received_at?: string | null
          parsed?: boolean
          parse_error?: string | null
          parsing_rule_id?: string | null
          created_at?: string
        }
      }
      purchases: {
        Row: {
          id: string
          admin_user_id: string
          amount: number
          currency: string
          merchant: string | null
          description: string | null
          purchase_date: string
          card_id: string | null
          category_id: string | null
          employee_id: string | null
          raw_email_id: string | null
          source: string
          notes: string | null
          order_number: string | null
          reviewed_by_initials: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          admin_user_id: string
          amount: number
          currency?: string
          merchant?: string | null
          description?: string | null
          purchase_date: string
          card_id?: string | null
          category_id?: string | null
          employee_id?: string | null
          raw_email_id?: string | null
          source?: string
          notes?: string | null
          order_number?: string | null
          reviewed_by_initials?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          admin_user_id?: string
          amount?: number
          currency?: string
          merchant?: string | null
          description?: string | null
          purchase_date?: string
          card_id?: string | null
          category_id?: string | null
          employee_id?: string | null
          raw_email_id?: string | null
          source?: string
          notes?: string | null
          order_number?: string | null
          reviewed_by_initials?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      card_shifts: {
        Row: {
          id: string
          admin_user_id: string
          card_id: string
          employee_id: string
          start_time: string
          end_time: string | null
          shift_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          admin_user_id: string
          card_id: string
          employee_id: string
          start_time: string
          end_time?: string | null
          shift_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          admin_user_id?: string
          card_id?: string
          employee_id?: string
          start_time?: string
          end_time?: string | null
          shift_id?: string | null
          created_at?: string
        }
      }
      gmail_sync_state: {
        Row: {
          id: string
          admin_user_id: string
          access_token: string | null
          refresh_token: string | null
          token_expiry: string | null
          label_id: string | null
          label_name: string | null
          last_sync_at: string | null
          last_history_id: string | null
          is_connected: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          admin_user_id: string
          access_token?: string | null
          refresh_token?: string | null
          token_expiry?: string | null
          label_id?: string | null
          label_name?: string | null
          last_sync_at?: string | null
          last_history_id?: string | null
          is_connected?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          admin_user_id?: string
          access_token?: string | null
          refresh_token?: string | null
          token_expiry?: string | null
          label_id?: string | null
          label_name?: string | null
          last_sync_at?: string | null
          last_history_id?: string | null
          is_connected?: boolean
          created_at?: string
          updated_at?: string
        }
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
  }
}
