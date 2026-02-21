"use client";

import { PendingRequestProvider } from "@/contexts/PendingRequestContext";
import AdminLayoutInner from "./AdminLayoutInner";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <PendingRequestProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </PendingRequestProvider>
  );
}
