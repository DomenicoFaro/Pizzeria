import type { Metadata } from "next";
import { MenuAdmin } from "@/components/admin/MenuAdmin";
import { requireStaffPage } from "@/lib/auth";
import { getMenu } from "@/lib/data";
import type { Modifier, ModifierGroup } from "@/lib/types";

export const metadata: Metadata = { title: "Menù" };

export default async function MenuAdminPage() {
  const { sb, role } = await requireStaffPage();
  const [menu, groups, mods] = await Promise.all([
    getMenu({ includeInactive: true, client: sb }),
    sb.from("modifier_groups").select("*").order("position"),
    sb.from("modifiers").select("*").order("position"),
  ]);
  const allGroups = ((groups.data ?? []) as ModifierGroup[]).map((g) => ({
    ...g,
    modifiers: ((mods.data ?? []) as Modifier[]).filter((m) => m.group_id === g.id).map((m) => ({ ...m, price_delta: Number(m.price_delta) })),
  }));
  return <MenuAdmin categories={menu} groups={allGroups} isAdmin={role === "admin"} />;
}
