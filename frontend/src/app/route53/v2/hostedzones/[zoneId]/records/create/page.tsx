"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Spinner from "@cloudscape-design/components/spinner";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import { usePageBreadcrumbs } from "@/components/shell/BreadcrumbProvider";
import { useNotifications } from "@/components/shell/NotificationProvider";
import { RecordForm } from "@/components/records/RecordForm";
import { useCreateRecords } from "@/hooks/useRecords";
import { useZone } from "@/hooks/useZones";
import { ApiError } from "@/lib/api-client";
import { stripTrailingDot } from "@/lib/format";
import { toCreatePayload } from "@/lib/record-form";

const BASE = "/route53/v2";

export default function CreateRecordPage() {
  const { zoneId } = useParams<{ zoneId: string }>();
  const router = useRouter();
  const { notify } = useNotifications();
  const zone = useZone(zoneId);
  const createRecords = useCreateRecords(zoneId);
  const [error, setError] = useState<string | null>(null);
  const zoneName = zone.data ? stripTrailingDot(zone.data.name) : zoneId;

  usePageBreadcrumbs([
    { text: "Route 53", href: `${BASE}/dashboard` },
    { text: "Hosted zones", href: `${BASE}/hostedzones` },
    { text: zoneName, href: `${BASE}/hostedzones/${zoneId}` },
    { text: "Create record", href: `${BASE}/hostedzones/${zoneId}/records/create` },
  ]);

  if (zone.error) {
    return (
      <ErrorAlert error={zone.error} header="Unable to load the hosted zone" onRetry={() => void zone.refetch()} retrying={zone.isFetching} />
    );
  }
  if (!zone.data) return <Spinner size="large" />;

  return (
    <RecordForm
      mode="create"
      zoneId={zoneId}
      zoneName={zoneName}
      submitting={createRecords.isPending}
      error={error}
      onDismissError={() => setError(null)}
      onCancel={() => router.push(`${BASE}/hostedzones/${zoneId}`)}
      onSubmit={async (blocks) => {
        setError(null);
        try {
          const created = await createRecords.mutateAsync(blocks.map(toCreatePayload));
          notify({
            type: "success",
            content: `Successfully created ${created.length} record${created.length === 1 ? "" : "s"}.`,
          });
          router.push(`${BASE}/hostedzones/${zoneId}`);
        } catch (e) {
          setError(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
          window.scrollTo({ top: 0 });
        }
      }}
    />
  );
}
