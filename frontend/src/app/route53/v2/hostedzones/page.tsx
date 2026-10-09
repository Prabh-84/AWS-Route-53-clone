"use client";

import Header from "@cloudscape-design/components/header";
import { usePageBreadcrumbs } from "@/components/shell/BreadcrumbProvider";

export default function HostedZonesPage() {
  usePageBreadcrumbs([
    { text: "Route 53", href: "/route53/v2/dashboard" },
    { text: "Hosted zones", href: "/route53/v2/hostedzones" },
  ]);

  return <Header variant="h1">Hosted zones (Phase 6)</Header>;
}
