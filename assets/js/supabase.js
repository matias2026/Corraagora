// Configuração do Supabase

const SUPABASE_URL = "https://ymaybqujglfajllruqub.supabase.co";

const SUPABASE_PUBLIC_KEY =
  "sb_publishable_l3qNE9dzBeefjdKpRyzVOg_bkm51ZI4";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLIC_KEY
);