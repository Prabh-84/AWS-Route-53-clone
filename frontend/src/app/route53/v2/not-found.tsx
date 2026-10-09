"use client";

import { NotFoundCard } from "@/components/common/NotFoundCard";
import { usePageBreadcrumbs } from "@/components/shell/BreadcrumbProvider";
import { BASE } from "@/lib/nav";

// Unknown URL inside the console: keep the top bar and side navigation.
export default function ConsoleNotFound() {
  usePageBreadcrumbs([
    { text: "Route 53", href: `${BASE}/dashboard` },
    { text: "Page not found", href: "#" },
  ]);
  return <NotFoundCard />;
}
