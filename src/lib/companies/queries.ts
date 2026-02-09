import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;

export const listCompanies = async (supabase: Client) => {
  return supabase
    .from("companies")
    .select("id,business_name,website_url,industry,stage,priority,score,created_at,updated_at,client_email,client_user_id")
    .order("updated_at", { ascending: false });
};

export const getCompanyById = async (supabase: Client, companyId: string) => {
  return supabase
    .from("companies")
    .select("id,business_name,website_url,industry,stage,priority,score,notes,owner_user_id,client_user_id,client_email,created_at,updated_at")
    .eq("id", companyId)
    .single();
};

export const getLatestScrape = async (supabase: Client, companyId: string) => {
  return supabase
    .from("website_scrapes")
    .select("id,url,summary,extracted_json,created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
};

export const getLatestAudit = async (supabase: Client, companyId: string) => {
  return supabase
    .from("audits")
    .select("id,status,mode,prompt,model_response,summary,created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
};

export const getAudits = async (supabase: Client, companyId: string, limit = 8) => {
  return supabase
    .from("audits")
    .select("id,status,mode,prompt,model_response,summary,created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);
};

export const getLatestProposal = async (supabase: Client, companyId: string) => {
  return supabase
    .from("proposals")
    .select("id,status,title,sections_json,html,created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
};

export const getProposals = async (supabase: Client, companyId: string, limit = 8) => {
  return supabase
    .from("proposals")
    .select("id,status,title,sections_json,html,created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);
};

export const getPortalSettings = async (supabase: Client, companyId: string) => {
  return supabase
    .from("portal_settings")
    .select("company_id,portal_enabled,created_at,updated_at")
    .eq("company_id", companyId)
    .maybeSingle();
};

export const getCompanyTasks = async (supabase: Client, companyId: string, limit = 12) => {
  return supabase
    .from("tasks")
    .select("id,title,status,priority,due_at,notes,created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);
};

