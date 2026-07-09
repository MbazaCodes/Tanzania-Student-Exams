/**
 * Convert a snake_case object (from Supabase) to camelCase for the frontend.
 * Handles nested objects and arrays recursively.
 */
export function toCamel<T = Record<string, unknown>>(obj: Record<string, unknown> | null | undefined): T | null {
  if (!obj) return null;
  if (Array.isArray(obj)) return obj.map((o) => toCamel(o as Record<string, unknown>)) as unknown as T;
  if (typeof obj !== "object") return obj as unknown as T;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const ck = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[ck] = v !== null && typeof v === "object" ? toCamel(v as Record<string, unknown>) : v;
  }
  return out as T;
}

/**
 * Convert a camelCase object (from the client) to snake_case for Supabase.
 */
export function toSnake(obj: Record<string, unknown>): Record<string, unknown> {
  if (!obj || typeof obj !== "object") return obj as Record<string, unknown>;
  if (Array.isArray(obj)) return obj.map((o) => toSnake(o as Record<string, unknown>));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const sk = k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
    out[sk] = v !== null && typeof v === "object" ? toSnake(v as Record<string, unknown>) : v;
  }
  return out;
}