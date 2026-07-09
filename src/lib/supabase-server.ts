import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  "https://pdyjpkgjiakvlqqcicjj.supabase.co";
const SUPABASE_SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkeWpwa2dqaWFrdmxxcWNpY2pqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzU2MjI4MywiZXhwIjoyMDk5MTM4MjgzfQ.xpqggJdI4uDbglVzv6HdsiIrztIWDVLfGAvuGlfdsOM";

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});