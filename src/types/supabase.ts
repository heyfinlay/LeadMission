export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      audits: {
        Row: {
          company_id: string;
          created_at: string;
          id: string;
          mode: Database["public"]["Enums"]["audit_mode"];
          model_response: string | null;
          owner_user_id: string;
          prompt: string | null;
          status: string;
          summary: string | null;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          id?: string;
          mode: Database["public"]["Enums"]["audit_mode"];
          model_response?: string | null;
          owner_user_id?: string;
          prompt?: string | null;
          status?: string;
          summary?: string | null;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          id?: string;
          mode?: Database["public"]["Enums"]["audit_mode"];
          model_response?: string | null;
          owner_user_id?: string;
          prompt?: string | null;
          status?: string;
          summary?: string | null;
        };
        Relationships: [];
      };
      companies: {
        Row: {
          business_name: string;
          client_email: string | null;
          client_user_id: string | null;
          created_at: string;
          id: string;
          industry: string | null;
          notes: string | null;
          owner_user_id: string;
          priority: string;
          score: number;
          stage: string;
          updated_at: string;
          website_url: string | null;
        };
        Insert: {
          business_name: string;
          client_email?: string | null;
          client_user_id?: string | null;
          created_at?: string;
          id?: string;
          industry?: string | null;
          notes?: string | null;
          owner_user_id?: string;
          priority?: string;
          score?: number;
          stage?: string;
          updated_at?: string;
          website_url?: string | null;
        };
        Update: {
          business_name?: string;
          client_email?: string | null;
          client_user_id?: string | null;
          created_at?: string;
          id?: string;
          industry?: string | null;
          notes?: string | null;
          owner_user_id?: string;
          priority?: string;
          score?: number;
          stage?: string;
          updated_at?: string;
          website_url?: string | null;
        };
        Relationships: [];
      };
      contacts: {
        Row: {
          company_id: string;
          created_at: string;
          email: string | null;
          id: string;
          name: string;
          owner_user_id: string;
          phone: string | null;
          role: string | null;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          email?: string | null;
          id?: string;
          name: string;
          owner_user_id?: string;
          phone?: string | null;
          role?: string | null;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          email?: string | null;
          id?: string;
          name?: string;
          owner_user_id?: string;
          phone?: string | null;
          role?: string | null;
        };
        Relationships: [];
      };
      portal_settings: {
        Row: {
          company_id: string;
          created_at: string;
          owner_user_id: string;
          portal_enabled: boolean;
          updated_at: string;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          owner_user_id?: string;
          portal_enabled?: boolean;
          updated_at?: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          owner_user_id?: string;
          portal_enabled?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      proposals: {
        Row: {
          company_id: string;
          created_at: string;
          html: string | null;
          id: string;
          owner_user_id: string;
          sections_json: Json;
          status: string;
          title: string;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          html?: string | null;
          id?: string;
          owner_user_id?: string;
          sections_json?: Json;
          status?: string;
          title?: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          html?: string | null;
          id?: string;
          owner_user_id?: string;
          sections_json?: Json;
          status?: string;
          title?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          company_id: string;
          created_at: string;
          created_by: string;
          due_at: string | null;
          id: string;
          notes: string | null;
          owner_user_id: string;
          priority: string;
          status: string;
          title: string;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          created_by?: string;
          due_at?: string | null;
          id?: string;
          notes?: string | null;
          owner_user_id?: string;
          priority?: string;
          status?: string;
          title: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          created_by?: string;
          due_at?: string | null;
          id?: string;
          notes?: string | null;
          owner_user_id?: string;
          priority?: string;
          status?: string;
          title?: string;
        };
        Relationships: [];
      };
      website_scrapes: {
        Row: {
          company_id: string;
          created_at: string;
          extracted_json: Json;
          id: string;
          owner_user_id: string;
          raw_text: string | null;
          summary: string | null;
          url: string;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          extracted_json?: Json;
          id?: string;
          owner_user_id?: string;
          raw_text?: string | null;
          summary?: string | null;
          url: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          extracted_json?: Json;
          id?: string;
          owner_user_id?: string;
          raw_text?: string | null;
          summary?: string | null;
          url?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      audit_mode: "in_app" | "prompt";
    };
    CompositeTypes: Record<string, never>;
  };
}

