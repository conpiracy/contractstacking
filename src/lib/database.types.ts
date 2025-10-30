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
      source_templates: {
        Row: {
          id: string
          name: string
          url: string
          scraper_type: string
          config_json: Json
          is_default: boolean
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          url: string
          scraper_type?: string
          config_json?: Json
          is_default?: boolean
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          url?: string
          scraper_type?: string
          config_json?: Json
          is_default?: boolean
          description?: string | null
          created_at?: string
        }
      }
      sources: {
        Row: {
          id: string
          name: string
          url: string
          scraper_type: string
          config_json: Json
          enabled: boolean
          last_run_at: string | null
          last_status: string
          last_error: string | null
          template_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          url: string
          scraper_type?: string
          config_json?: Json
          enabled?: boolean
          last_run_at?: string | null
          last_status?: string
          last_error?: string | null
          template_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          url?: string
          scraper_type?: string
          config_json?: Json
          enabled?: boolean
          last_run_at?: string | null
          last_status?: string
          last_error?: string | null
          template_id?: string | null
          created_at?: string
        }
      }
      jobs: {
        Row: {
          id: string
          title: string
          company: string
          company_size: number | null
          ote_min: number | null
          ote_max: number | null
          location: string
          tags: string[]
          apply_url: string
          source_id: string | null
          source_name: string
          scraped_at: string
          created_at: string
          contract_type: string
          hourly_rate: number | null
          payment_terms: string | null
          is_payment_verified: boolean
          rating: number | null
          project_type: string | null
          allowed_locations: string[]
        }
        Insert: {
          id?: string
          title: string
          company: string
          company_size?: number | null
          ote_min?: number | null
          ote_max?: number | null
          location?: string
          tags?: string[]
          apply_url: string
          source_id?: string | null
          source_name: string
          scraped_at?: string
          created_at?: string
          contract_type?: string
          hourly_rate?: number | null
          payment_terms?: string | null
          is_payment_verified?: boolean
          rating?: number | null
          project_type?: string | null
          allowed_locations?: string[]
        }
        Update: {
          id?: string
          title?: string
          company?: string
          company_size?: number | null
          ote_min?: number | null
          ote_max?: number | null
          location?: string
          tags?: string[]
          apply_url?: string
          source_id?: string | null
          source_name?: string
          scraped_at?: string
          created_at?: string
          contract_type?: string
          hourly_rate?: number | null
          payment_terms?: string | null
          is_payment_verified?: boolean
          rating?: number | null
          project_type?: string | null
          allowed_locations?: string[]
        }
      }
      scrape_logs: {
        Row: {
          id: string
          source_id: string | null
          status: string
          started_at: string
          completed_at: string | null
          jobs_found: number
          jobs_inserted: number
          error_message: string | null
          log_entries: string[]
          created_at: string
        }
        Insert: {
          id?: string
          source_id?: string | null
          status?: string
          started_at?: string
          completed_at?: string | null
          jobs_found?: number
          jobs_inserted?: number
          error_message?: string | null
          log_entries?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          source_id?: string | null
          status?: string
          started_at?: string
          completed_at?: string | null
          jobs_found?: number
          jobs_inserted?: number
          error_message?: string | null
          log_entries?: string[]
          created_at?: string
        }
      }
    }
  }
}
