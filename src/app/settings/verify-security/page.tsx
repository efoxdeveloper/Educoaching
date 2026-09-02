import { Suspense } from "react";
import { VerifySecurityClient } from "@/components/settings/VerifySecurityClient";

export default function VerifySecurityPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-paper">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-scholar-600 border-t-transparent" />
        </div>
      }
    >
      <VerifySecurityClient />
    </Suspense>
  );
}
