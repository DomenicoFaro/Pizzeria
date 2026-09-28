import type { Metadata } from "next";
import { BookingsAdmin } from "@/components/admin/BookingsAdmin";
import { requireStaffPage } from "@/lib/auth";
import { addDays, romeDateKey } from "@/lib/time";
import type { EventRequest, Reservation } from "@/lib/types";

export const metadata: Metadata = { title: "Prenotazioni" };

export default async function BookingsPage() {
  const { sb } = await requireStaffPage();
  const since = addDays(romeDateKey(new Date()), -1);
  const [res, ev] = await Promise.all([
    sb.from("reservations").select("*").gte("date", since).order("date").order("time"),
    sb.from("event_requests").select("*").order("created_at", { ascending: false }).limit(100),
  ]);
  return <BookingsAdmin reservations={(res.data ?? []) as Reservation[]} events={(ev.data ?? []) as EventRequest[]} />;
}
