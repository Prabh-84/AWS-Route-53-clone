"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "@/lib/api-client";
import type { DnsRecord, PaginatedRecords, RecordBulkDeleteResult } from "@/lib/types";
import { zoneKeys } from "./useZones";

export interface RecordListParams {
  search?: string;
  type?: string;
  routing_policy?: string;
  page: number;
  page_size: number;
}

// Nested under the "zones" key so invalidating zones also refreshes record lists (record_count changes).
export const recordKeys = {
  list: (zoneId: string, params: RecordListParams) => [...zoneKeys.all, "records", zoneId, params] as const,
  nameServers: (zoneId: string) => [...zoneKeys.all, "records", zoneId, "name-servers"] as const,
};

export function useRecordList(zoneId: string, params: RecordListParams) {
  return useQuery({
    queryKey: recordKeys.list(zoneId, params),
    queryFn: () => api.get<PaginatedRecords>(`/hostedzones/${zoneId}/records`, { ...params }),
    placeholderData: keepPreviousData,
  });
}

/** The zone's delegation name servers live in its system NS record. */
export function useZoneNameServers(zoneId: string) {
  return useQuery({
    queryKey: recordKeys.nameServers(zoneId),
    queryFn: async () => {
      const page = await api.get<PaginatedRecords>(`/hostedzones/${zoneId}/records`, { type: "NS", page_size: 100 });
      return page.items.find((record) => record.is_system)?.values ?? [];
    },
  });
}

/** Deletes one record (DELETE) or several (bulk-delete); always resolves to the bulk result shape. */
export function useDeleteRecords(zoneId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (records: DnsRecord[]): Promise<RecordBulkDeleteResult> => {
      if (records.length > 1) {
        return api.post<RecordBulkDeleteResult>(`/hostedzones/${zoneId}/records/bulk-delete`, {
          ids: records.map((r) => r.id),
        });
      }
      const [record] = records;
      try {
        await api.delete(`/hostedzones/${zoneId}/records/${record.id}`);
        return { deleted: [record.id], failed: [] };
      } catch (error) {
        if (error instanceof ApiError) return { deleted: [], failed: [{ id: record.id, error: error.message }] };
        throw error;
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: zoneKeys.all }),
  });
}
