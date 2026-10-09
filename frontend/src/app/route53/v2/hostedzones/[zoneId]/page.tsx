"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import Spinner from "@cloudscape-design/components/spinner";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Tabs from "@cloudscape-design/components/tabs";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import { ConfirmDeleteModal } from "@/components/common/ConfirmDeleteModal";
import { InfoLink } from "@/components/common/InfoLink";
import { usePageBreadcrumbs } from "@/components/shell/BreadcrumbProvider";
import { useNotifications } from "@/components/shell/NotificationProvider";
import { RecordsTab } from "@/components/zones/RecordsTab";
import { ZoneDetailsCard } from "@/components/zones/ZoneDetailsCard";
import { ZoneTagsTab } from "@/components/zones/ZoneTagsTab";
import { useZoneNameServers } from "@/hooks/useRecords";
import { useDeleteZones, useZone } from "@/hooks/useZones";
import { ApiError } from "@/lib/api-client";
import { stripTrailingDot } from "@/lib/format";

const BASE = "/route53/v2";

export default function ZoneDetailsPage() {
  const { zoneId } = useParams<{ zoneId: string }>();
  const router = useRouter();
  const { notify } = useNotifications();
  const zoneQuery = useZone(zoneId);
  const nameServers = useZoneNameServers(zoneId);
  const deleteZones = useDeleteZones();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("records");

  const zone = zoneQuery.data;
  const name = zone ? stripTrailingDot(zone.name) : zoneId;

  usePageBreadcrumbs([
    { text: "Route 53", href: `${BASE}/dashboard` },
    { text: "Hosted zones", href: `${BASE}/hostedzones` },
    { text: name, href: `${BASE}/hostedzones/${zoneId}` },
  ]);

  if (zoneQuery.error) {
    return (
      <ErrorAlert
        error={zoneQuery.error}
        header="Unable to load the hosted zone"
        onRetry={() => void zoneQuery.refetch()}
        retrying={zoneQuery.isFetching}
      />
    );
  }
  if (!zone) return <Spinner size="large" />;

  const handleDelete = async () => {
    setDeleteError(null);
    try {
      const result = await deleteZones.mutateAsync([zone]);
      if (result.deleted.length > 0) {
        notify({ type: "success", content: `Successfully deleted hosted zone '${name}'.` });
        router.push(`${BASE}/hostedzones`);
      } else {
        // e.g. 409 HostedZoneNotEmpty: keep the dialog open and explain.
        setDeleteError(result.failed[0]?.error ?? "The hosted zone could not be deleted.");
      }
    } catch (e) {
      setDeleteError(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
    }
  };

  const closeDelete = () => {
    setDeleteOpen(false);
    setDeleteError(null);
  };

  return (
    <SpaceBetween size="l">
      <Header
        variant="h1"
        info={<InfoLink />}
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button onClick={() => setDeleteOpen(true)}>Delete zone</Button>
            <Button>Test record</Button>
            <Button>Configure query logging</Button>
          </SpaceBetween>
        }
      >
        {name}
      </Header>

      <ZoneDetailsCard zone={zone} nameServers={nameServers.data} />

      <Tabs
        activeTabId={activeTab}
        onChange={({ detail }) => setActiveTab(detail.activeTabId)}
        tabs={[
          {
            id: "records",
            label: `Records (${zone.record_count})`,
            content: <RecordsTab zoneId={zoneId} />,
          },
          {
            id: "dnssec",
            label: "DNSSEC signing",
            content: (
              <Container header={<Header variant="h2">DNSSEC signing</Header>}>
                <Box color="text-body-secondary">DNSSEC signing is not enabled</Box>
              </Container>
            ),
          },
          {
            id: "tags",
            label: "Hosted zone tags",
            content: <ZoneTagsTab zoneId={zoneId} zoneName={name} />,
          },
        ]}
      />

      <ConfirmDeleteModal
        visible={deleteOpen}
        resourceLabel="hosted zone"
        names={[name]}
        loading={deleteZones.isPending}
        error={deleteError}
        onConfirm={handleDelete}
        onDismiss={closeDelete}
      />
    </SpaceBetween>
  );
}
