"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import KeyValuePairs from "@cloudscape-design/components/key-value-pairs";
import Spinner from "@cloudscape-design/components/spinner";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import { usePageBreadcrumbs } from "@/components/shell/BreadcrumbProvider";
import { useNotifications } from "@/components/shell/NotificationProvider";
import { RecordForm } from "@/components/records/RecordForm";
import { useRecord, useUpdateRecord } from "@/hooks/useRecords";
import { useZone } from "@/hooks/useZones";
import { ApiError } from "@/lib/api-client";
import { stripTrailingDot } from "@/lib/format";
import { blockFromRecord, toUpdatePayload } from "@/lib/record-form";

const BASE = "/route53/v2";

export default function EditRecordPage() {
  const { zoneId, recordId } = useParams<{ zoneId: string; recordId: string }>();
  const router = useRouter();
  const { notify } = useNotifications();
  const zone = useZone(zoneId);
  const record = useRecord(zoneId, recordId);
  const updateRecord = useUpdateRecord(zoneId, recordId);
  const [error, setError] = useState<string | null>(null);
  const zoneName = zone.data ? stripTrailingDot(zone.data.name) : zoneId;
  const backToZone = () => router.push(`${BASE}/hostedzones/${zoneId}`);

  usePageBreadcrumbs([
    { text: "Route 53", href: `${BASE}/dashboard` },
    { text: "Hosted zones", href: `${BASE}/hostedzones` },
    { text: zoneName, href: `${BASE}/hostedzones/${zoneId}` },
    { text: "Edit record", href: `${BASE}/hostedzones/${zoneId}/records/${recordId}/edit` },
  ]);

  const failure = zone.error ?? record.error;
  if (failure) {
    const notFound = failure instanceof ApiError && failure.status === 404;
    return (
      <SpaceBetween size="m">
        {notFound ? (
          <Alert type="warning" header="Record not found">
            The record you are trying to edit doesn&apos;t exist. It may have been deleted.
          </Alert>
        ) : (
          <ErrorAlert
            error={failure}
            header="Unable to load the record"
            onRetry={() => {
              void zone.refetch();
              void record.refetch();
            }}
            retrying={zone.isFetching || record.isFetching}
          />
        )}
        <div>
          <Button onClick={backToZone}>Back to hosted zone</Button>
        </div>
      </SpaceBetween>
    );
  }
  if (!zone.data || !record.data) return <Spinner size="large" />;

  const data = record.data;

  // System records (SOA/NS) can't be edited; show them read-only.
  if (data.is_system) {
    return (
      <SpaceBetween size="l">
        <Header variant="h1">Record details</Header>
        <Alert type="info">This is a required system record. It can&apos;t be edited or deleted.</Alert>
        <Container header={<Header variant="h2">{stripTrailingDot(data.name)}</Header>}>
          <KeyValuePairs
            columns={3}
            items={[
              { label: "Record name", value: stripTrailingDot(data.name) },
              { label: "Type", value: data.type },
              { label: "TTL (seconds)", value: data.ttl ?? "-" },
              {
                label: "Value",
                value: (
                  <div>
                    {data.values.map((v) => (
                      <Box key={v} variant="p">
                        {v}
                      </Box>
                    ))}
                  </div>
                ),
              },
            ]}
          />
        </Container>
        <div>
          <Button onClick={backToZone}>Back to hosted zone</Button>
        </div>
      </SpaceBetween>
    );
  }

  return (
    <RecordForm
      mode="edit"
      zoneId={zoneId}
      zoneName={zoneName}
      initialValues={blockFromRecord(data)}
      submitting={updateRecord.isPending}
      error={error}
      onDismissError={() => setError(null)}
      onCancel={backToZone}
      onSubmit={async ([block]) => {
        setError(null);
        try {
          await updateRecord.mutateAsync(toUpdatePayload(block));
          notify({ type: "success", content: `Successfully updated record '${block.name || zoneName}' (${block.type}).` });
          backToZone();
        } catch (e) {
          setError(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
          window.scrollTo({ top: 0 });
        }
      }}
    />
  );
}
