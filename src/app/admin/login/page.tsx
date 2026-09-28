import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLogin } from "@/components/admin/AdminLogin";

export const metadata: Metadata = { title: "Accesso staff", robots: { index: false } };

export default function AdminLoginPage() {
  return (
    <div className="bg-lava-texture flex min-h-dvh items-center justify-center p-4">
      <Suspense>
        <AdminLogin />
      </Suspense>
    </div>
  );
}
