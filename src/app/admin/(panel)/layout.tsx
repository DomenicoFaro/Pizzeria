import { AdminNav } from "@/components/admin/AdminNav";
import { requireStaffPage } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaffPage();
  return (
    <div className="lg:pl-60">
      <AdminNav role={staff.role} email={staff.user.email ?? ""} />
      <div className="px-3 pb-24 pt-4 sm:px-6 lg:pb-8">{children}</div>
    </div>
  );
}
