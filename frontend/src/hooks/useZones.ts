"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "@/lib/api-client";
import type {
  BulkDeleteResult,
  HostedZone,
  HostedZoneCreate,
  HostedZoneListItem,
  HostedZoneUpdate,
  PaginatedZones,
  Tags,
} from "@/lib/types";

export interface ZoneListParams {
  search?: string;
  page: number;
  page_size: number;
  sort?: string;
}

export const zoneKeys = {
  all: ["zones"] as const,
  list: (params: ZoneListParams) => ["zones", "list", params] as const,
  detail: (id: string) => ["zones", "detail", id] as const,
  tags: (id: string) => ["zones", "tags", id] as const,
};

export function useZoneList(params: ZoneListParams) {
  return useQuery({
    queryKey: zoneKeys.list(params),
    queryFn: () => api.get<PaginatedZones>("/hostedzones", { ...params }),
    placeholderData: keepPreviousData,
  });
}

export function useZone(id: string) {
  return useQuery({ queryKey: zoneKeys.detail(id), queryFn: () => api.get<HostedZone>(`/hostedzones/${id}`) });
}

export function useZoneTags(id: string) {
  return useQuery({
    queryKey: zoneKeys.tags(id),
    queryFn: async () => (await api.get<Tags>(`/hostedzones/${id}/tags`)).tags,
  });
}

export function useCreateZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: HostedZoneCreate) => api.post<HostedZone>("/hostedzones", body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: zoneKeys.all }),
  });
}

export function useUpdateZone(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: HostedZoneUpdate) => api.patch<HostedZone>(`/hostedzones/${id}`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: zoneKeys.all }),
  });
}

export function useSetZoneTags(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tags: Record<string, string>) => api.put<Tags>(`/hostedzones/${id}/tags`, { tags }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: zoneKeys.tags(id) }),
  });
}

/** Deletes one zone (DELETE) or several (bulk-delete); always resolves to the bulk result shape. */
export function useDeleteZones() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (zones: HostedZoneListItem[]): Promise<BulkDeleteResult> => {
      if (zones.length > 1) {
        return api.post<BulkDeleteResult>("/hostedzones/bulk-delete", { ids: zones.map((z) => z.id) });
      }
      const [zone] = zones;
      try {
        await api.delete(`/hostedzones/${zone.id}`);
        return { deleted: [zone.id], failed: [] };
      } catch (error) {
        if (error instanceof ApiError) return { deleted: [], failed: [{ id: zone.id, error: error.message }] };
        throw error;
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: zoneKeys.all }),
  });
}
