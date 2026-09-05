import { Suspense } from "react";
import { AdminVerifyEmailClient } from "@/components/admin/AdminVerifyEmailClient";

export default function AdminVerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-paper">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-scholar-600 border-t-transparent" />
        </div>
      }
    >
      <AdminVerifyEmailClient />
    </Suspense>
  );
}
