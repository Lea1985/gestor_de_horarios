// app/protected/dashboard/layout.tsx

import { DashboardLayout } from "@/app/ui/components/layout/DashboardLayout"

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>
}