"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Badge from "@cloudscape-design/components/badge";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Link from "@cloudscape-design/components/link";
import SpaceBetween from "@cloudscape-design/components/space-between";
import type { TableProps } from "@cloudscape-design/components/table";
import { ConfirmDeleteModal } from "@/components/common/ConfirmDeleteModal";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import { ResourceTable } from "@/components/common/ResourceTable";
import { usePageBreadcrumbs } from "@/components/shell/BreadcrumbProvider";
import { useNotifications } from "@/components/shell/NotificationProvider";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useFollow } from "@/hooks/useFollow";
import { useShortcuts } from "@/hooks/useShortcuts";
import { useDeleteZones, useZoneList } from "@/hooks/useZones";
import { ApiError } from "@/lib/api-client";
import { stripTrailingDot } from "@/lib/format";
import type { HostedZoneListItem } from "@/lib/types";

const BASE = "/route53/v2";

const columns: TableProps.ColumnDefinition<HostedZoneListItem>[] = [
  {
    id: "name",
    header: "Hosted zone name",
    cell: (zone) => <ZoneLink zone={zone} />,
    isRowHeader: true,
  },
  {
    id: "type",
    header: "Type",
    cell: (zone) => <Badge color={zone.type === "PUBLIC" ? "blue" : "grey"}>{zone.type === "PUBLIC" ? "Public" : "Private"}</Badge>,
  },
  { id: "record_count", header: "Record count", cell: (zone) => zone.record_count },
  { id: "comment", header: "Description", cell: (zone) => zone.comment || "-" },
  {
    id: "id",
    header: "Hosted zone ID",
    cell: (zone) => (
      <Box variant="code" color="text-body-secondary">
        {zone.id}
      </Box>
    ),
  },
];

function ZoneLink({ zone }: { zone: HostedZoneListItem }) {
  const onFollow = useFollow();
  return (
    <Link href={`${BASE}/hostedzones/${zone.id}`} onFollow={onFollow}>
      {stripTrailingDot(zone.name)}
    </Link>
  );
}

export default function HostedZonesPage() {
  const router = useRouter();
  const { notify } = useNotifications();
  const onFollow = useFollow();
  usePageBreadcrumbs([
    { text: "Route 53", href: `${BASE}/dashboard` },
    { text: "Hosted zones", href: `${BASE}/hostedzones` },
  ]);

  const [filteringText, setFilteringText] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<HostedZoneListItem[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const search = useDebouncedValue(filteringText.trim(), 300);

  const { data, isLoading, isFetching, error, refetch } = useZoneList({ search, page, page_size: pageSize, sort: "name" });
  const deleteZones = useDeleteZones();

  const total = data?.total ?? 0;
  const only = selected.length === 1 ? selected[0] : null;

  useShortcuts({
    onCreate: () => router.push(`${BASE}/hostedzones/create`),
    onEdit: () => only && router.push(`${BASE}/hostedzones/${only.id}/edit`),
    onDelete: () => selected.length > 0 && setDeleteOpen(true),
    onRefresh: () => void refetch(),
  });

  const handleDelete = async () => {
    const zones = selected;
    try {
      const result = await deleteZones.mutateAsync(zones);
      if (result.deleted.length > 0) {
        const names = zones.filter((z) => result.deleted.includes(z.id)).map((z) => stripTrailingDot(z.name));
        notify({
          type: "success",
          content:
            names.length === 1
              ? `Successfully deleted hosted zone '${names[0]}'.`
              : `Successfully deleted ${names.length} hosted zones: ${names.join(", ")}.`,
        });
      }
      for (const failure of result.failed) {
        const found = zones.find((z) => z.id === failure.id);
        const name = found ? stripTrailingDot(found.name) : failure.id;
        notify({ type: "error", header: `Failed to delete hosted zone '${name}'`, content: failure.error });
      }
    } catch (e) {
      notify({
        type: "error",
        header: "Failed to delete hosted zones",
        content: e instanceof ApiError ? e.message : "Something went wrong. Please try again.",
      });
    } finally {
      setSelected([]);
      setDeleteOpen(false);
    }
  };

  return (
    <>
      {error && (
        <div style={{ marginBottom: 16 }}>
          <ErrorAlert error={error} header="Unable to load hosted zones" onRetry={() => void refetch()} retrying={isFetching} />
        </div>
      )}
      <ResourceTable
        columnDefinitions={columns}
        items={data?.items ?? []}
        trackBy={(zone) => zone.id}
        loading={isLoading || (isFetching && !data)}
        selectionType="multi"
        selectedItems={selected}
        onSelectionChange={setSelected}
        title="Hosted zones"
        counter={`(${total})`}
        info={
          <Link variant="info" onFollow={onFollow}>
            Info
          </Link>
        }
        description="Automatic mode is the current search behavior, optimized for best filter results. To change modes, choose the settings icon."
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button disabled={!only} onClick={() => only && router.push(`${BASE}/hostedzones/${only.id}`)}>
              View details
            </Button>
            <Button disabled={!only} onClick={() => only && router.push(`${BASE}/hostedzones/${only.id}/edit`)}>
              Edit
            </Button>
            <Button disabled={selected.length === 0} onClick={() => setDeleteOpen(true)}>
              Delete
            </Button>
            <Button variant="primary" onClick={() => router.push(`${BASE}/hostedzones/create`)}>
              Create hosted zone
            </Button>
          </SpaceBetween>
        }
        resourceName="hosted zones"
        empty={{
          title: "No hosted zones",
          description: "You don't have any hosted zones.",
          action: <Button onClick={() => router.push(`${BASE}/hostedzones/create`)}>Create hosted zone</Button>,
        }}
        filteringPlaceholder="Filter hosted zones by property or value"
        filteringText={filteringText}
        onFilteringTextChange={(text) => {
          setFilteringText(text);
          setPage(1);
        }}
        totalCount={total}
        currentPage={page}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
      <ConfirmDeleteModal
        visible={deleteOpen}
        resourceLabel="hosted zone"
        names={selected.map((zone) => stripTrailingDot(zone.name))}
        loading={deleteZones.isPending}
        onConfirm={handleDelete}
        onDismiss={() => setDeleteOpen(false)}
      />
    </>
  );
}
