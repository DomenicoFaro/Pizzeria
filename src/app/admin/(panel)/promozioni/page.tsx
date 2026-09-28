import type { Metadata } from "next";
import { PromotionsAdmin } from "@/components/admin/PromotionsAdmin";
import { requireStaffPage } from "@/lib/auth";
import type { DiscountCode } from "@/lib/types";

export const metadata: Metadata = { title: "Promozioni" };

export default async function PromotionsPage() {
  const { sb } = await requireStaffPage(true);
  const { data } = await sb.from("discount_codes").select("*").order("created_at", { ascending: false });
  return <PromotionsAdmin codes={(data ?? []) as DiscountCode[]} />;
}
