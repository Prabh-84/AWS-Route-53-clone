import { AppShell } from "@/components/shell/AppShell";
import { BreadcrumbProvider } from "@/components/shell/BreadcrumbProvider";
import { NotificationProvider } from "@/components/shell/NotificationProvider";

export default function Route53Layout({ children }: { children: React.ReactNode }) {
  return (
    <NotificationProvider>
      <BreadcrumbProvider>
        <AppShell>{children}</AppShell>
      </BreadcrumbProvider>
    </NotificationProvider>
  );
}
