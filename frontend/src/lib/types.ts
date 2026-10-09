// Types mirroring the backend Pydantic schemas (backend/app/schemas/).

// --- Auth -------------------------------------------------------------------
export interface User {
  id: number;
  email: string;
  display_name: string;
  account_id: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface MessageResponse {
  message: string;
}

// --- Shared -----------------------------------------------------------------
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}

// --- Hosted zones -----------------------------------------------------------
export type ZoneType = "PUBLIC" | "PRIVATE";

export interface Vpc {
  region: string;
  vpc_id: string;
}

export interface HostedZoneListItem {
  id: string;
  name: string;
  type: ZoneType;
  comment: string;
  record_count: number;
  created_at: string;
  updated_at: string;
}

export interface HostedZone extends HostedZoneListItem {
  vpcs: Vpc[];
}

export type PaginatedZones = PaginatedResponse<HostedZoneListItem>;

export interface HostedZoneCreate {
  name: string;
  comment?: string | null;
  type: ZoneType;
  vpcs?: Vpc[];
}

export interface HostedZoneUpdate {
  comment?: string | null;
  vpcs?: Vpc[] | null;
}

export interface BulkDeleteResult {
  deleted: string[];
  failed: { id: string; error: string }[];
}

export interface Tags {
  tags: Record<string, string>;
}

// --- DNS records ------------------------------------------------------------
// Named DnsRecord so it doesn't shadow TypeScript's built-in Record<K, V>.
export type RecordType = "A" | "AAAA" | "CNAME" | "TXT" | "MX" | "NS" | "PTR" | "SRV" | "CAA";
export type RoutingPolicy = "SIMPLE" | "WEIGHTED" | "LATENCY" | "FAILOVER" | "GEOLOCATION" | "MULTIVALUE";
export type FailoverRole = "PRIMARY" | "SECONDARY";

export interface AliasTarget {
  dns_name: string;
  hosted_zone_id: string;
  evaluate_target_health: boolean;
}

/** Fields shared by create and update. */
export interface DnsRecordFields {
  ttl: number | null;
  values: string[];
  routing_policy?: RoutingPolicy;
  set_identifier?: string | null;
  weight?: number | null;
  region?: string | null;
  failover?: FailoverRole | null;
  geo_location?: string | null;
  alias_target?: AliasTarget | null;
  health_check_id?: string | null;
}

export interface DnsRecordCreate extends DnsRecordFields {
  /** Relative label, "@"/"" for the apex, or a full name inside the zone. */
  name: string;
  type: RecordType;
}

/** name and type are immutable after creation. */
export type DnsRecordUpdate = DnsRecordFields;

export interface DnsRecord {
  id: number;
  zone_id: string;
  name: string;
  /** Includes "SOA", which only exists as a system record. */
  type: RecordType | "SOA";
  ttl: number | null;
  values: string[];
  routing_policy: RoutingPolicy;
  set_identifier: string | null;
  weight: number | null;
  region: string | null;
  failover: FailoverRole | null;
  geo_location: string | null;
  alias_target: AliasTarget | null;
  health_check_id: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export type PaginatedRecords = PaginatedResponse<DnsRecord>;

export interface DnsRecordBatchResult {
  records: DnsRecord[];
}

export interface RecordBulkDeleteResult {
  deleted: number[];
  failed: { id: number; error: string }[];
}

// --- Zone file import / export ----------------------------------------------
export interface ImportRecord {
  name: string;
  type: string;
  ttl: number | null;
  values: string[];
}

export interface ImportSkip {
  line: number | null;
  record: string;
  reason: string;
}

export interface ImportPreview {
  dry_run: true;
  would_create: ImportRecord[];
  would_skip: ImportSkip[];
}

export interface ImportSummary {
  dry_run: false;
  created: ImportRecord[];
  skipped: ImportSkip[];
}
