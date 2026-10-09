import { AppShell } from "@/components/shell/AppShell";
import { BreadcrumbProvider } from "@/components/shell/BreadcrumbProvider";
import { ShortcutsProvider } from "@/components/shell/ShortcutsProvider";
import { NotificationProvider } from "@/components/shell/NotificationProvider";

export default function Route53Layout({ children }: { children: React.ReactNode }) {
  return (
    <NotificationProvider>
      <BreadcrumbProvider>
        <ShortcutsProvider>
          <AppShell>{children}</AppShell>
        </ShortcutsProvider>
      </BreadcrumbProvider>
    </NotificationProvider>
  );
}
