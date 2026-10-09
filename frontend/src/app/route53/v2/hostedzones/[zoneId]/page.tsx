"use client";

import { useParams } from "next/navigation";
import Box from "@cloudscape-design/components/box";
import Header from "@cloudscape-design/components/header";
import { usePageBreadcrumbs } from "@/components/shell/BreadcrumbProvider";
import { useZone } from "@/hooks/useZones";
import { ApiError } from "@/lib/api-client";
import { stripTrailingDot } from "@/lib/format";

const BASE = "/route53/v2";

/** Placeholder zone details page; Phase 7 replaces it with the records UI. */
export default function ZoneDetailsPage() {
  const { zoneId } = useParams<{ zoneId: string }>();
  const { data: zone, error } = useZone(zoneId);

  usePageBreadcrumbs([
    { text: "Route 53", href: `${BASE}/dashboard` },
    { text: "Hosted zones", href: `${BASE}/hostedzones` },
    { text: zone ? stripTrailingDot(zone.name) : zoneId, href: `${BASE}/hostedzones/${zoneId}` },
  ]);

  if (error) {
    return <Box color="text-status-error">{error instanceof ApiError ? error.message : "Unable to load the hosted zone."}</Box>;
  }
  return <Header variant="h1">{zone ? stripTrailingDot(zone.name) : "Loading…"} (zone details, Phase 7)</Header>;
}
