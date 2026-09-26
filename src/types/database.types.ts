export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
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
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string | null
          created_at: string
          details: Json
          id: string
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_user_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          admin_user_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      agencies: {
        Row: {
          created_at: string
          credit_overdraft: number
          current_period_end: string | null
          id: string
          is_test: boolean
          logo_url: string | null
          name: string
          owner_user_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
        }
        Insert: {
          created_at?: string
          credit_overdraft?: number
          current_period_end?: string | null
          id?: string
          is_test?: boolean
          logo_url?: string | null
          name: string
          owner_user_id: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
        }
        Update: {
          created_at?: string
          credit_overdraft?: number
          current_period_end?: string | null
          id?: string
          is_test?: boolean
          logo_url?: string | null
          name?: string
          owner_user_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
        }
        Relationships: []
      }
      agent_readiness_actions: {
        Row: {
          action_type: string
          business_id: string
          claude_prompt: string | null
          confidence: string | null
          created_at: string
          detected: boolean
          evidence: string | null
          id: string
          label: string
          page_url: string | null
          recommendation: string | null
          recommended_tool_name: string | null
          scan_id: string
          verification_status: string
          verified_at: string | null
          webmcp_ready: boolean
        }
        Insert: {
          action_type: string
          business_id: string
          claude_prompt?: string | null
          confidence?: string | null
          created_at?: string
          detected?: boolean
          evidence?: string | null
          id?: string
          label: string
          page_url?: string | null
          recommendation?: string | null
          recommended_tool_name?: string | null
          scan_id: string
          verification_status?: string
          verified_at?: string | null
          webmcp_ready?: boolean
        }
        Update: {
          action_type?: string
          business_id?: string
          claude_prompt?: string | null
          confidence?: string | null
          created_at?: string
          detected?: boolean
          evidence?: string | null
          id?: string
          label?: string
          page_url?: string | null
          recommendation?: string | null
          recommended_tool_name?: string | null
          scan_id?: string
          verification_status?: string
          verified_at?: string | null
          webmcp_ready?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "agent_readiness_actions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_readiness_actions_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "agent_readiness_scans"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_readiness_scans: {
        Row: {
          actions_detected: number
          actions_ready: number
          business_id: string
          completed_at: string | null
          created_at: string
          domain: string
          error: string | null
          id: string
          readiness_score: number | null
          readiness_status: string | null
          started_at: string
          status: string
          webmcp_detected: boolean
          webmcp_tool_count: number
        }
        Insert: {
          actions_detected?: number
          actions_ready?: number
          business_id: string
          completed_at?: string | null
          created_at?: string
          domain: string
          error?: string | null
          id?: string
          readiness_score?: number | null
          readiness_status?: string | null
          started_at?: string
          status?: string
          webmcp_detected?: boolean
          webmcp_tool_count?: number
        }
        Update: {
          actions_detected?: number
          actions_ready?: number
          business_id?: string
          completed_at?: string | null
          created_at?: string
          domain?: string
          error?: string | null
          id?: string
          readiness_score?: number | null
          readiness_status?: string | null
          started_at?: string
          status?: string
          webmcp_detected?: boolean
          webmcp_tool_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_readiness_scans_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_answer_cache: {
        Row: {
          answer: string
          cache_key: string
          citations: Json
          created_at: string
          location: string
          model: string
          question: string
        }
        Insert: {
          answer: string
          cache_key: string
          citations?: Json
          created_at?: string
          location: string
          model: string
          question: string
        }
        Update: {
          answer?: string
          cache_key?: string
          citations?: Json
          created_at?: string
          location?: string
          model?: string
          question?: string
        }
        Relationships: []
      }
      billing_accounts: {
        Row: {
          billing_interval: string
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_interval?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_interval?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      business_billing_items: {
        Row: {
          billing_account_id: string
          business_id: string
          created_at: string
          current_period_end: string | null
          id: string
          plan_id: string
          price_monthly_cents: number | null
          status: string
          stripe_subscription_item_id: string | null
          updated_at: string
        }
        Insert: {
          billing_account_id: string
          business_id: string
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_id?: string
          price_monthly_cents?: number | null
          status?: string
          stripe_subscription_item_id?: string | null
          updated_at?: string
        }
        Update: {
          billing_account_id?: string
          business_id?: string
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_id?: string
          price_monthly_cents?: number | null
          status?: string
          stripe_subscription_item_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_billing_items_billing_account_id_fkey"
            columns: ["billing_account_id"]
            isOneToOne: false
            referencedRelation: "billing_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_billing_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_competitors: {
        Row: {
          business_id: string
          category: string | null
          city: string | null
          confirmed: boolean
          country: string | null
          created_at: string
          domain: string | null
          enrichment_status: string
          formatted_address: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          phone: string | null
          place_id: string | null
          places_id: string | null
          region: string | null
          source: string | null
        }
        Insert: {
          business_id: string
          category?: string | null
          city?: string | null
          confirmed?: boolean
          country?: string | null
          created_at?: string
          domain?: string | null
          enrichment_status?: string
          formatted_address?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          phone?: string | null
          place_id?: string | null
          places_id?: string | null
          region?: string | null
          source?: string | null
        }
        Update: {
          business_id?: string
          category?: string | null
          city?: string | null
          confirmed?: boolean
          country?: string | null
          created_at?: string
          domain?: string | null
          enrichment_status?: string
          formatted_address?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          phone?: string | null
          place_id?: string | null
          places_id?: string | null
          region?: string | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_competitors_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_site_facts: {
        Row: {
          business_id: string
          data: Json
          fetched_at: string
        }
        Insert: {
          business_id: string
          data?: Json
          fetched_at?: string
        }
        Update: {
          business_id?: string
          data?: Json
          fetched_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_site_facts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_subscriptions: {
        Row: {
          agency_id: string
          business_id: string
          created_at: string
          current_period_end: string | null
          plan_id: string
          status: string
          stripe_subscription_item_id: string | null
        }
        Insert: {
          agency_id: string
          business_id: string
          created_at?: string
          current_period_end?: string | null
          plan_id: string
          status?: string
          stripe_subscription_item_id?: string | null
        }
        Update: {
          agency_id?: string
          business_id?: string
          created_at?: string
          current_period_end?: string | null
          plan_id?: string
          status?: string
          stripe_subscription_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_subscriptions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_subscriptions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_credit_balance"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "business_subscriptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          agency_id: string | null
          aliases: string[]
          created_at: string
          description: string | null
          domain: string | null
          has_website: boolean | null
          id: string
          industry: string | null
          language: string
          logo_url: string | null
          models: string[]
          name: string
          next_scan_at: string | null
          onboarding_step: number | null
          owner_user_id: string
          phone: string | null
          places_id: string | null
          primary_city: string | null
          primary_country: string | null
          primary_region: string | null
          reach_type: string | null
          scan_frequency: string
          services: string[]
          status: string
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          aliases?: string[]
          created_at?: string
          description?: string | null
          domain?: string | null
          has_website?: boolean | null
          id?: string
          industry?: string | null
          language?: string
          logo_url?: string | null
          models?: string[]
          name: string
          next_scan_at?: string | null
          onboarding_step?: number | null
          owner_user_id: string
          phone?: string | null
          places_id?: string | null
          primary_city?: string | null
          primary_country?: string | null
          primary_region?: string | null
          reach_type?: string | null
          scan_frequency?: string
          services?: string[]
          status?: string
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          aliases?: string[]
          created_at?: string
          description?: string | null
          domain?: string | null
          has_website?: boolean | null
          id?: string
          industry?: string | null
          language?: string
          logo_url?: string | null
          models?: string[]
          name?: string
          next_scan_at?: string | null
          onboarding_step?: number | null
          owner_user_id?: string
          phone?: string | null
          places_id?: string | null
          primary_city?: string | null
          primary_country?: string | null
          primary_region?: string | null
          reach_type?: string | null
          scan_frequency?: string
          services?: string[]
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "businesses_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_credit_balance"
            referencedColumns: ["agency_id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          company: string | null
          created_at: string
          email: string
          id: string
          ip_hash: string | null
          message: string
          name: string
          notes: string | null
          page_path: string | null
          phone: string | null
          read_at: string | null
          source: string | null
          status: string
          topic: string
          user_id: string | null
          website: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          id?: string
          ip_hash?: string | null
          message: string
          name: string
          notes?: string | null
          page_path?: string | null
          phone?: string | null
          read_at?: string | null
          source?: string | null
          status?: string
          topic?: string
          user_id?: string | null
          website?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          ip_hash?: string | null
          message?: string
          name?: string
          notes?: string | null
          page_path?: string | null
          phone?: string | null
          read_at?: string | null
          source?: string | null
          status?: string
          topic?: string
          user_id?: string | null
          website?: string | null
        }
        Relationships: []
      }
      credit_grants: {
        Row: {
          agency_id: string
          amount: number
          business_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          remaining: number
          source: string
          source_id: string
        }
        Insert: {
          agency_id: string
          amount: number
          business_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          remaining: number
          source: string
          source_id: string
        }
        Update: {
          agency_id?: string
          amount?: number
          business_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          remaining?: number
          source?: string
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_grants_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_grants_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_credit_balance"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "credit_grants_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_holds: {
        Row: {
          agency_id: string
          amount: number
          captured: number
          closed_at: string | null
          created_at: string
          id: string
          released: number
          scan_job_id: string | null
          status: string
        }
        Insert: {
          agency_id: string
          amount: number
          captured?: number
          closed_at?: string | null
          created_at?: string
          id?: string
          released?: number
          scan_job_id?: string | null
          status?: string
        }
        Update: {
          agency_id?: string
          amount?: number
          captured?: number
          closed_at?: string | null
          created_at?: string
          id?: string
          released?: number
          scan_job_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_holds_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_holds_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_credit_balance"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "credit_holds_scan_job_id_fkey"
            columns: ["scan_job_id"]
            isOneToOne: true
            referencedRelation: "scan_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          admin_user_id: string | null
          agency_id: string | null
          created_at: string
          delta: number
          grant_id: string | null
          hold_id: string | null
          id: string
          kind: string
          note: string | null
          source_id: string
          source_type: string
        }
        Insert: {
          admin_user_id?: string | null
          agency_id?: string | null
          created_at?: string
          delta: number
          grant_id?: string | null
          hold_id?: string | null
          id?: string
          kind: string
          note?: string | null
          source_id: string
          source_type: string
        }
        Update: {
          admin_user_id?: string | null
          agency_id?: string | null
          created_at?: string
          delta?: number
          grant_id?: string | null
          hold_id?: string | null
          id?: string
          kind?: string
          note?: string | null
          source_id?: string
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_credit_balance"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "credit_transactions_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "credit_grants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_hold_id_fkey"
            columns: ["hold_id"]
            isOneToOne: false
            referencedRelation: "credit_holds"
            referencedColumns: ["id"]
          },
        ]
      }
      customers_direct_leads: {
        Row: {
          business_name: string
          business_type: string | null
          call_bar_bg_color: string | null
          call_bar_business_phone: string | null
          call_bar_text: string | null
          call_bar_text_color: string | null
          created_at: string
          email: string
          followed_up_at: string | null
          full_name: string
          goal: string | null
          id: string
          notes: string | null
          phone: string
          referrer_url: string | null
          source: string | null
          status: string
          website: string
        }
        Insert: {
          business_name: string
          business_type?: string | null
          call_bar_bg_color?: string | null
          call_bar_business_phone?: string | null
          call_bar_text?: string | null
          call_bar_text_color?: string | null
          created_at?: string
          email: string
          followed_up_at?: string | null
          full_name: string
          goal?: string | null
          id?: string
          notes?: string | null
          phone: string
          referrer_url?: string | null
          source?: string | null
          status?: string
          website: string
        }
        Update: {
          business_name?: string
          business_type?: string | null
          call_bar_bg_color?: string | null
          call_bar_business_phone?: string | null
          call_bar_text?: string | null
          call_bar_text_color?: string | null
          created_at?: string
          email?: string
          followed_up_at?: string | null
          full_name?: string
          goal?: string | null
          id?: string
          notes?: string | null
          phone?: string
          referrer_url?: string | null
          source?: string | null
          status?: string
          website?: string
        }
        Relationships: []
      }
      feature_requests: {
        Row: {
          business_id: string | null
          created_at: string
          description: string
          id: string
          page_context: string | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          description: string
          id?: string
          page_context?: string | null
          status?: string
          title: string
          user_id: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          description?: string
          id?: string
          page_context?: string | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          affected_url: string | null
          business_id: string
          category: string
          claude_prompt: string | null
          created_at: string
          description: string | null
          evidence: string | null
          id: string
          impact: string
          recommended_action: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          affected_url?: string | null
          business_id: string
          category: string
          claude_prompt?: string | null
          created_at?: string
          description?: string | null
          evidence?: string | null
          id?: string
          impact?: string
          recommended_action?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          affected_url?: string | null
          business_id?: string
          category?: string
          claude_prompt?: string | null
          created_at?: string
          description?: string | null
          evidence?: string | null
          id?: string
          impact?: string
          recommended_action?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          active: boolean
          id: string
          max_competitors: number | null
          max_questions: number | null
          monthly_credits: number | null
          name: string
          price_cents: number | null
          stripe_price_id: string | null
        }
        Insert: {
          active?: boolean
          id: string
          max_competitors?: number | null
          max_questions?: number | null
          monthly_credits?: number | null
          name: string
          price_cents?: number | null
          stripe_price_id?: string | null
        }
        Update: {
          active?: boolean
          id?: string
          max_competitors?: number | null
          max_questions?: number | null
          monthly_credits?: number | null
          name?: string
          price_cents?: number | null
          stripe_price_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: string
          active_business_id: string | null
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          trial_ends_at: string | null
          trial_starts_at: string | null
          updated_at: string
        }
        Insert: {
          account_type?: string
          active_business_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          trial_ends_at?: string | null
          trial_starts_at?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: string
          active_business_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          trial_ends_at?: string | null
          trial_starts_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_business_id_fkey"
            columns: ["active_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      prospecting_folders: {
        Row: {
          created_at: string
          id: string
          name: string
          search_query: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          search_query?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          search_query?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      prospecting_leads: {
        Row: {
          address: string | null
          business_name: string
          category: string | null
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          contact_title: string | null
          created_at: string
          folder_id: string | null
          google_maps_url: string | null
          google_place_id: string
          id: string
          last_contacted_at: string | null
          lead_score: number
          next_follow_up_at: string | null
          notes: string | null
          phone: string | null
          rating: number | null
          review_count: number | null
          state: string | null
          status: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          business_name: string
          category?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_title?: string | null
          created_at?: string
          folder_id?: string | null
          google_maps_url?: string | null
          google_place_id: string
          id?: string
          last_contacted_at?: string | null
          lead_score?: number
          next_follow_up_at?: string | null
          notes?: string | null
          phone?: string | null
          rating?: number | null
          review_count?: number | null
          state?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          business_name?: string
          category?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_title?: string | null
          created_at?: string
          folder_id?: string | null
          google_maps_url?: string | null
          google_place_id?: string
          id?: string
          last_contacted_at?: string | null
          lead_score?: number
          next_follow_up_at?: string | null
          notes?: string | null
          phone?: string | null
          rating?: number | null
          review_count?: number | null
          state?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospecting_leads_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "prospecting_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      question_library: {
        Row: {
          active: boolean
          created_at: string
          id: string
          industry: string
          intent: string
          tags: string[]
          template: string
          version: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          industry: string
          intent: string
          tags?: string[]
          template: string
          version?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          industry?: string
          intent?: string
          tags?: string[]
          template?: string
          version?: number
        }
        Relationships: []
      }
      report_shares: {
        Row: {
          business_id: string
          created_at: string
          id: string
          revoked_at: string | null
          token: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          revoked_at?: string | null
          token: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          revoked_at?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_shares_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_jobs: {
        Row: {
          agency_id: string
          attempts: number
          business_id: string
          created_at: string
          credits_charged: number
          error: string | null
          finished_at: string | null
          hold_id: string | null
          id: string
          locked_at: string | null
          priority: number
          run_after: string
          status: string
        }
        Insert: {
          agency_id: string
          attempts?: number
          business_id: string
          created_at?: string
          credits_charged?: number
          error?: string | null
          finished_at?: string | null
          hold_id?: string | null
          id?: string
          locked_at?: string | null
          priority?: number
          run_after?: string
          status?: string
        }
        Update: {
          agency_id?: string
          attempts?: number
          business_id?: string
          created_at?: string
          credits_charged?: number
          error?: string | null
          finished_at?: string | null
          hold_id?: string | null
          id?: string
          locked_at?: string | null
          priority?: number
          run_after?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_jobs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_jobs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_credit_balance"
            referencedColumns: ["agency_id"]
          },
          {
            foreignKeyName: "scan_jobs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_jobs_hold_id_fkey"
            columns: ["hold_id"]
            isOneToOne: false
            referencedRelation: "credit_holds"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_snapshots: {
        Row: {
          backlinks: Json
          business_id: string
          competitors: Json
          created_at: string
          domain: string
          fetched_at: string
          id: string
          keyword_gaps: Json
          overview: Json
          raw_response: Json | null
          top_keywords: Json
        }
        Insert: {
          backlinks?: Json
          business_id: string
          competitors?: Json
          created_at?: string
          domain: string
          fetched_at?: string
          id?: string
          keyword_gaps?: Json
          overview?: Json
          raw_response?: Json | null
          top_keywords?: Json
        }
        Update: {
          backlinks?: Json
          business_id?: string
          competitors?: Json
          created_at?: string
          domain?: string
          fetched_at?: string
          id?: string
          keyword_gaps?: Json
          overview?: Json
          raw_response?: Json | null
          top_keywords?: Json
        }
        Relationships: [
          {
            foreignKeyName: "seo_snapshots_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          business_id: string
          created_at: string
          id: string
          notes: string | null
          opportunity_id: string | null
          requested_by: string
          status: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          notes?: string | null
          opportunity_id?: string | null
          requested_by: string
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          opportunity_id?: string | null
          requested_by?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_webhook_events: {
        Row: {
          error: string | null
          event_type: string
          id: string
          processed_at: string
          stripe_event_id: string
        }
        Insert: {
          error?: string | null
          event_type: string
          id?: string
          processed_at?: string
          stripe_event_id: string
        }
        Update: {
          error?: string | null
          event_type?: string
          id?: string
          processed_at?: string
          stripe_event_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          business_id: string
          created_at: string
          current_period_end: string | null
          id: string
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      system_alerts: {
        Row: {
          created_at: string
          details: Json
          emailed_at: string | null
          id: string
          kind: string
          message: string
          resolved_at: string | null
          severity: string
        }
        Insert: {
          created_at?: string
          details?: Json
          emailed_at?: string | null
          id?: string
          kind: string
          message: string
          resolved_at?: string | null
          severity?: string
        }
        Update: {
          created_at?: string
          details?: Json
          emailed_at?: string | null
          id?: string
          kind?: string
          message?: string
          resolved_at?: string | null
          severity?: string
        }
        Relationships: []
      }
      tracked_prompts: {
        Row: {
          active: boolean
          business_id: string
          buyer_intent: string | null
          category: string | null
          created_at: string
          id: string
          location: string | null
          prompt: string
        }
        Insert: {
          active?: boolean
          business_id: string
          buyer_intent?: string | null
          category?: string | null
          created_at?: string
          id?: string
          location?: string | null
          prompt: string
        }
        Update: {
          active?: boolean
          business_id?: string
          buyer_intent?: string | null
          category?: string | null
          created_at?: string
          id?: string
          location?: string | null
          prompt?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracked_prompts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_events: {
        Row: {
          account_user_id: string
          business_id: string | null
          created_at: string
          estimated_cost_usd: number
          id: string
          input_tokens: number | null
          metadata: Json | null
          model: string | null
          output_tokens: number | null
          provider: string | null
          quantity: number
          request_count: number
          usage_type: string
          visibility_run_id: string | null
        }
        Insert: {
          account_user_id: string
          business_id?: string | null
          created_at?: string
          estimated_cost_usd?: number
          id?: string
          input_tokens?: number | null
          metadata?: Json | null
          model?: string | null
          output_tokens?: number | null
          provider?: string | null
          quantity?: number
          request_count?: number
          usage_type: string
          visibility_run_id?: string | null
        }
        Update: {
          account_user_id?: string
          business_id?: string | null
          created_at?: string
          estimated_cost_usd?: number
          id?: string
          input_tokens?: number | null
          metadata?: Json | null
          model?: string | null
          output_tokens?: number | null
          provider?: string | null
          quantity?: number
          request_count?: number
          usage_type?: string
          visibility_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      visibility_results: {
        Row: {
          business_id: string
          business_mentioned: boolean
          cited_sources: Json
          competitors_mentioned: Json
          created_at: string
          id: string
          mention_position: number | null
          methodology: string | null
          provider: string
          raw_response: Json | null
          run_id: string
          sentiment: string | null
          tracked_prompt_id: string | null
        }
        Insert: {
          business_id: string
          business_mentioned?: boolean
          cited_sources?: Json
          competitors_mentioned?: Json
          created_at?: string
          id?: string
          mention_position?: number | null
          methodology?: string | null
          provider: string
          raw_response?: Json | null
          run_id: string
          sentiment?: string | null
          tracked_prompt_id?: string | null
        }
        Update: {
          business_id?: string
          business_mentioned?: boolean
          cited_sources?: Json
          competitors_mentioned?: Json
          created_at?: string
          id?: string
          mention_position?: number | null
          methodology?: string | null
          provider?: string
          raw_response?: Json | null
          run_id?: string
          sentiment?: string | null
          tracked_prompt_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visibility_results_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visibility_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "visibility_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visibility_results_tracked_prompt_id_fkey"
            columns: ["tracked_prompt_id"]
            isOneToOne: false
            referencedRelation: "tracked_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      visibility_runs: {
        Row: {
          business_id: string
          completed_at: string | null
          created_at: string
          error: string | null
          id: string
          provider: string
          started_at: string
          status: string
        }
        Insert: {
          business_id: string
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          provider: string
          started_at?: string
          status?: string
        }
        Update: {
          business_id?: string
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          provider?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "visibility_runs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      visibility_scores: {
        Row: {
          business_id: string
          calculated_at: string
          citation_rate: number | null
          competitor_share: number | null
          id: string
          mention_rate: number | null
          prompts_tested: number | null
          prompts_won: number | null
          score: number
        }
        Insert: {
          business_id: string
          calculated_at?: string
          citation_rate?: number | null
          competitor_share?: number | null
          id?: string
          mention_rate?: number | null
          prompts_tested?: number | null
          prompts_won?: number | null
          score: number
        }
        Update: {
          business_id?: string
          calculated_at?: string
          citation_rate?: number | null
          competitor_share?: number | null
          id?: string
          mention_rate?: number | null
          prompts_tested?: number | null
          prompts_won?: number | null
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "visibility_scores_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      agency_credit_balance: {
        Row: {
          agency_id: string | null
          balance: number | null
          held: number | null
          overdraft: number | null
          plan_remaining: number | null
          topup_remaining: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_adjust_credits: {
        Args: {
          p_admin_user_id: string
          p_agency_id: string
          p_delta: number
          p_note: string
          p_request_id: string
        }
        Returns: string
      }
      capture_credit: {
        Args: { p_check_id: string; p_hold_id: string }
        Returns: boolean
      }
      credit_add_grant: {
        Args: {
          p_admin_user_id: string
          p_agency_id: string
          p_amount: number
          p_expires_at: string
          p_kind: string
          p_note: string
          p_source: string
          p_source_id: string
        }
        Returns: string
      }
      credit_lock_agency: { Args: { p_agency_id: string }; Returns: number }
      expire_grants: { Args: never; Returns: number }
      grant_credits: {
        Args: {
          p_agency_id: string
          p_amount: number
          p_expires_at?: string
          p_source: string
          p_source_id: string
        }
        Returns: string
      }
      hold_credits: {
        Args: { p_agency_id: string; p_amount: number; p_scan_job_id: string }
        Returns: string
      }
      release_hold: { Args: { p_hold_id: string }; Returns: number }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

