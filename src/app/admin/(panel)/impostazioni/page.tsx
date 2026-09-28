import type { Metadata } from "next";
import { SettingsAdmin } from "@/components/admin/SettingsAdmin";
import { requireStaffPage } from "@/lib/auth";
import { getClosures, getHours, getSettings, getZones } from "@/lib/data";

export const metadata: Metadata = { title: "Impostazioni" };

export default async function SettingsPage() {
  const { sb } = await requireStaffPage(true);
  const [settings, hours, closures, zones] = await Promise.all([getSettings(sb), getHours(sb), getClosures(sb), getZones(sb)]);
  return <SettingsAdmin settings={settings} hours={hours} closures={closures} zones={zones} />;
}
