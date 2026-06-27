import { getSupabaseBrowserClient } from "@/lib/supabase/client";

// Compatibility export for existing imports. New code should use client.ts helpers.
export const supabase = getSupabaseBrowserClient();
