import { Suspense } from "react";
import { AdminVerifyEmailClient } from "@/components/admin/AdminVerifyEmailClient";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";

export default function AdminVerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#F7F5F0" }}>
          <CircularProgress size={32} sx={{ color: "#1E3A5F" }} />
        </Box>
      }
    >
      <AdminVerifyEmailClient />
    </Suspense>
  );
}
