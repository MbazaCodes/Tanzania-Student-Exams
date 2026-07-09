import { cookies } from "next/headers";
import { supabaseAdmin } from "./supabase-server";
import { toCamel } from "./case";
import type { User } from "./types";

export const SESSION_COOKIE = "eh_uid";

/**
 * Returns the current demo user based on the eh_uid cookie.
 * Falls back to the first super_admin user, then first user, then null.
 */
export async function currentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const uid = cookieStore.get(SESSION_COOKIE)?.value;

    if (uid) {
      const { data } = await supabaseAdmin
        .from("users")
        .select("*, school:schools(*)")
        .eq("id", uid)
        .maybeSingle();
      if (data) return toCamel<User>(data as Record<string, unknown>);
    }

    // Fallback: first super_admin
    const { data: admin } = await supabaseAdmin
      .from("users")
      .select("*, school:schools(*)")
      .eq("role", "super_admin")
      .limit(1)
      .maybeSingle();
    if (admin) return toCamel<User>(admin as Record<string, unknown>);

    // Last resort: any user
    const { data: anyUser } = await supabaseAdmin
      .from("users")
      .select("*, school:schools(*)")
      .limit(1)
      .maybeSingle();
    if (anyUser) return toCamel<User>(anyUser as Record<string, unknown>);

    return null;
  } catch {
    return null;
  }
}

export function canManageContent(role: string | undefined): boolean {
  return role === "teacher" || role === "school_admin" || role === "super_admin";
}

export function canReview(role: string | undefined): boolean {
  return canManageContent(role);
}

export function isAdmin(role: string | undefined): boolean {
  return role === "super_admin";
}