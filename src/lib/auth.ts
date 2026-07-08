import { cookies } from "next/headers";
import { db } from "./db";

export const SESSION_COOKIE = "eh_uid";

// Returns the current demo user based on the eh_uid cookie.
// Falls back to the super_admin user (so the app is never empty).
export async function currentUser() {
  const cookieStore = await cookies();
  const uid = cookieStore.get(SESSION_COOKIE)?.value;
  if (uid) {
    const u = await db.user.findUnique({
      where: { id: uid },
      include: { school: true },
    });
    if (u) return u;
  }
  // fallback: super_admin, then first user, then null
  const admin = await db.user.findFirst({
    where: { role: "super_admin" },
    include: { school: true },
  });
  if (admin) return admin;
  return db.user.findFirst({ include: { school: true } });
}

export function canManageContent(role: string | undefined): boolean {
  return (
    role === "teacher" || role === "school_admin" || role === "super_admin"
  );
}

export function canReview(role: string | undefined): boolean {
  return canManageContent(role);
}

export function isAdmin(role: string | undefined): boolean {
  return role === "super_admin";
}
