"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Badge from "@cloudscape-design/components/badge";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import SpaceBetween from "@cloudscape-design/components/space-between";
import type { PropertyFilterProps } from "@cloudscape-design/components/property-filter";
import type { TableProps } from "@cloudscape-design/components/table";
import { ConfirmDeleteModal } from "@/components/common/ConfirmDeleteModal";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import { ResourceTable } from "@/components/common/ResourceTable";
import { useNotifications } from "@/components/shell/NotificationProvider";
import { useDeleteRecords, useRecordList } from "@/hooks/useRecords";
import { ApiError } from "@/lib/api-client";
import { stripTrailingDot } from "@/lib/format";
import type { DnsRecord } from "@/lib/types";

const BASE = "/route53/v2";
const RECORD_TYPES = ["A", "AAAA", "CAA", "CNAME", "MX", "NS", "PTR", "SOA", "SRV", "TXT"];
const ROUTING_POLICIES = ["SIMPLE", "WEIGHTED", "LATENCY", "FAILOVER", "GEOLOCATION", "MULTIVALUE"];

const titleCase = (value: string) => value.charAt(0) + value.slice(1).toLowerCase();

const filteringProperties: PropertyFilterProps.FilteringProperty[] = [
  { key: "name", propertyLabel: "Record name", groupValuesLabel: "Record name values", operators: [":"] },
  { key: "type", propertyLabel: "Type", groupValuesLabel: "Type values", operators: ["="] },
  { key: "routing_policy", propertyLabel: "Routing policy", groupValuesLabel: "Routing policy values", operators: ["="] },
];

const filteringOptions: PropertyFilterProps.FilteringOption[] = [
  ...RECORD_TYPES.map((value) => ({ propertyKey: "type", value })),
  ...ROUTING_POLICIES.map((value) => ({ propertyKey: "routing_policy", value, label: titleCase(value) })),
];

/** Translate filter tokens into the API's search / type / routing_policy query params (last token per property wins). */
function queryToParams(query: PropertyFilterProps.Query) {
  const params: { search?: string; type?: string; routing_policy?: string } = {};
  for (const token of query.tokens) {
    if (token.propertyKey === "type") params.type = token.value;
    else if (token.propertyKey === "routing_policy") params.routing_policy = token.value;
    else params.search = token.value; // "name" or free text: both match on the record name
  }
  return params;
}

const columns: TableProps.ColumnDefinition<DnsRecord>[] = [
  {
    id: "name",
    header: "Record name",
    isRowHeader: true,
    cell: (record) => (
      <SpaceBetween direction="horizontal" size="xs">
        <span>{stripTrailingDot(record.name)}</span>
        {record.is_system && <Badge color="grey">system</Badge>}
      </SpaceBetween>
    ),
  },
  { id: "type", header: "Type", cell: (record) => <Badge color="grey">{record.type}</Badge> },
  { id: "routing_policy", header: "Routing policy", cell: (record) => titleCase(record.routing_policy) },
  {
    id: "value",
    header: "Value/Route traffic to",
    cell: (record) =>
      record.alias_target ? (
        <span>{record.alias_target.dns_name}</span>
      ) : (
        <div>
          {record.values.map((value) => (
            <div key={value} style={{ wordBreak: "break-all" }}>
              {value}
            </div>
          ))}
        </div>
      ),
  },
  { id: "ttl", header: "TTL (seconds)", cell: (record) => (record.alias_target || record.ttl === null ? "-" : record.ttl) },
  {
    id: "id",
    header: "Record ID",
    cell: (record) => (
      <Box variant="small" color="text-body-secondary">
        {record.id}
      </Box>
    ),
  },
];

export function RecordsTab({ zoneId }: { zoneId: string }) {
  const router = useRouter();
  const { notify } = useNotifications();
  const [query, setQuery] = useState<PropertyFilterProps.Query>({ tokens: [], operation: "and" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<DnsRecord[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const filterParams = useMemo(() => queryToParams(query), [query]);
  const { data, isLoading, isFetching, error, refetch } = useRecordList(zoneId, { ...filterParams, page, page_size: pageSize });
  const deleteRecords = useDeleteRecords(zoneId);

  const total = data?.total ?? 0;
  const hasSystemSelected = selected.some((record) => record.is_system);
  const only = selected.length === 1 && !hasSystemSelected ? selected[0] : null;
  const recordLabel = (record: DnsRecord) => `${stripTrailingDot(record.name)} (${record.type})`;

  const handleDelete = async () => {
    const records = selected;
    try {
      const result = await deleteRecords.mutateAsync(records);
      if (result.deleted.length > 0) {
        const names = records.filter((r) => result.deleted.includes(r.id)).map(recordLabel);
        notify({
          type: "success",
          content:
            names.length === 1
              ? `Successfully deleted record '${names[0]}'.`
              : `Successfully deleted ${names.length} records: ${names.join(", ")}.`,
        });
      }
      for (const failure of result.failed) {
        const record = records.find((r) => r.id === failure.id);
        notify({
          type: "error",
          header: `Failed to delete record '${record ? recordLabel(record) : failure.id}'`,
          content: failure.error,
        });
      }
    } catch (e) {
      notify({
        type: "error",
        header: "Failed to delete records",
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
          <ErrorAlert error={error} header="Unable to load records" onRetry={() => void refetch()} retrying={isFetching} />
        </div>
      )}
      <ResourceTable
        columnDefinitions={columns}
        items={data?.items ?? []}
        trackBy={(record) => String(record.id)}
        loading={isLoading}
        selectionType="multi"
        selectedItems={selected}
        onSelectionChange={setSelected}
        isItemDisabled={(record) => record.is_system}
        title="Records"
        counter={`(${total})`}
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button
              disabled={!only}
              onClick={() => only && router.push(`${BASE}/hostedzones/${zoneId}/records/${only.id}/edit`)}
            >
              Edit record
            </Button>
            <Button disabled={selected.length === 0 || hasSystemSelected} onClick={() => setDeleteOpen(true)}>
              Delete record
            </Button>
            <Button disabled>Import zone file</Button>
            <Button variant="primary" onClick={() => router.push(`${BASE}/hostedzones/${zoneId}/records/create`)}>
              Create record
            </Button>
          </SpaceBetween>
        }
        resourceName="records"
        empty={{
          title: "No records",
          description: "This hosted zone has no records.",
          action: <Button onClick={() => router.push(`${BASE}/hostedzones/${zoneId}/records/create`)}>Create record</Button>,
        }}
        filteringPlaceholder="Filter records by property or value"
        propertyFilter={{ query, onChange: (q) => { setQuery(q); setPage(1); setSelected([]); }, filteringProperties, filteringOptions }}
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
        resourceLabel="record"
        names={selected.map(recordLabel)}
        loading={deleteRecords.isPending}
        onConfirm={handleDelete}
        onDismiss={() => setDeleteOpen(false)}
      />
    </>
  );
}
