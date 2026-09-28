import "server-only";
import { redirect } from "next/navigation";
import { getServerSupabase } from "./supabase/server";

export type StaffRole = "admin" | "staff";

export async function getStaff() {
  const sb = await getServerSupabase();
  const { data } = await sb.auth.getUser();
  if (!data.user) return null;
  const { data: member } = await sb.from("staff_members").select("role, name").eq("user_id", data.user.id).maybeSingle();
  if (!member) return { user: data.user, role: null as StaffRole | null, name: null, sb };
  return { user: data.user, role: member.role as StaffRole, name: member.name as string | null, sb };
}

/** Per pagine admin: reindirizza al login se non autorizzato */
export async function requireStaffPage(adminOnly = false) {
  const s = await getStaff();
  if (!s) redirect("/admin/login");
  if (!s.role) redirect("/admin/login?errore=permessi");
  if (adminOnly && s.role !== "admin") redirect("/admin/ordini");
  return s as NonNullable<typeof s> & { role: StaffRole };
}

/** Per Server Actions: lancia errore se non autorizzato */
export async function requireStaffAction(adminOnly = false) {
  const s = await getStaff();
  if (!s?.role) throw new Error("Non autorizzato");
  if (adminOnly && s.role !== "admin") throw new Error("Solo il titolare può modificare questa sezione");
  return s as NonNullable<typeof s> & { role: StaffRole };
}
