import { z } from "zod";
import type { DnsRecord, DnsRecordCreate, DnsRecordUpdate, RecordType, RoutingPolicy } from "./types";
import { stripTrailingDot } from "./format";

export const RECORD_TYPES = ["A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA"] as const;
export const ROUTING_POLICIES = ["SIMPLE", "WEIGHTED", "LATENCY", "FAILOVER", "GEOLOCATION", "MULTIVALUE"] as const;

/** Types that can be an alias record in Route 53 (as supported by this app). */
export const ALIAS_TYPES: readonly string[] = ["A", "AAAA", "CNAME"];

export const TYPE_DESCRIPTIONS: Record<RecordType, string> = {
  A: "A – Routes traffic to an IPv4 address and some AWS resources.",
  AAAA: "AAAA – Routes traffic to an IPv6 address and some AWS resources.",
  CNAME: "CNAME – Routes traffic to another domain name and to some AWS resources.",
  TXT: "TXT – Used to verify email senders and for application-specific values.",
  MX: "MX – Routes traffic to mail servers.",
  NS: "NS – Delegates a subdomain to a set of name servers.",
  PTR: "PTR – Maps an IP address to a domain name.",
  SRV: "SRV – Application-specific values that identify servers.",
  CAA: "CAA – Restricts CAs that can create SSL/TLS certifications for the domain.",
};

export const VALUE_PLACEHOLDERS: Record<RecordType, string> = {
  A: "192.0.2.235",
  AAAA: "2001:db8:85a3::8a2e:370:7334",
  CNAME: "www.example.com",
  TXT: '"Sample text"',
  MX: "10 mail.example.com.",
  NS: "ns-1.example.net.",
  PTR: "host.example.com.",
  SRV: "1 10 5060 sip.example.com.",
  CAA: '0 issue "letsencrypt.org"',
};

export const ROUTING_POLICY_LABELS: Record<RoutingPolicy, string> = {
  SIMPLE: "Simple routing",
  WEIGHTED: "Weighted",
  LATENCY: "Latency",
  FAILOVER: "Failover",
  GEOLOCATION: "Geolocation",
  MULTIVALUE: "Multivalue answer",
};

export const TTL_PRESETS = [
  { label: "1m", seconds: 60 },
  { label: "5m", seconds: 300 },
  { label: "1h", seconds: 3600 },
  { label: "1d", seconds: 86400 },
];

/** One record's worth of form state. Numeric inputs are kept as strings until submit. */
export interface RecordBlockValues {
  name: string;
  type: RecordType;
  alias: boolean;
  aliasDnsName: string;
  aliasHostedZoneId: string;
  evaluateTargetHealth: boolean;
  valuesText: string;
  ttl: string;
  routingPolicy: RoutingPolicy;
  setIdentifier: string;
  weight: string;
  region: string;
  failover: "" | "PRIMARY" | "SECONDARY";
  geoLocation: string;
}

export interface RecordFormValues {
  records: RecordBlockValues[];
}

export const emptyBlock = (zoneId: string): RecordBlockValues => ({
  name: "",
  type: "A",
  alias: false,
  aliasDnsName: "",
  aliasHostedZoneId: zoneId,
  evaluateTargetHealth: false,
  valuesText: "",
  ttl: "300",
  routingPolicy: "SIMPLE",
  setIdentifier: "",
  weight: "",
  region: "",
  failover: "",
  geoLocation: "",
});

export function blockFromRecord(record: DnsRecord): RecordBlockValues {
  return {
    name: stripTrailingDot(record.name),
    type: record.type as RecordType,
    alias: record.alias_target !== null,
    aliasDnsName: record.alias_target?.dns_name ?? "",
    aliasHostedZoneId: record.alias_target?.hosted_zone_id ?? record.zone_id,
    evaluateTargetHealth: record.alias_target?.evaluate_target_health ?? false,
    valuesText: record.values.join("\n"),
    ttl: record.ttl === null ? "300" : String(record.ttl),
    routingPolicy: record.routing_policy,
    setIdentifier: record.set_identifier ?? "",
    weight: record.weight === null ? "" : String(record.weight),
    region: record.region ?? "",
    failover: record.failover ?? "",
    geoLocation: record.geo_location ?? "",
  };
}

export const splitLines = (text: string): string[] =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

// --- validation: obvious-mistake hints only; the backend is the source of truth ---------------
const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const IPV6 = /^[0-9a-fA-F:.]+$/;
const HOSTNAME = /^[A-Za-z0-9_*]([A-Za-z0-9_*.-]*[A-Za-z0-9_*])?\.?$/;
const GEO = /^(\*|AF|AN|AS|EU|OC|NA|SA|[A-Za-z]{2}|[A-Za-z]{2}-[A-Za-z0-9]{1,3})$/;

const isPort16 = (n: string) => /^\d{1,5}$/.test(n) && Number(n) <= 65535;

/** Returns an error message for the first bad line, or null. */
export function validateValueLines(type: RecordType, lines: string[]): string | null {
  if (lines.length === 0) return "Enter at least one value.";
  if (type === "CNAME" && lines.length !== 1) return "A CNAME record must have exactly one value.";
  for (const line of lines) {
    switch (type) {
      case "A": {
        const m = IPV4.exec(line);
        if (!m || m.slice(1).some((part) => Number(part) > 255)) return `'${line}' is not a valid IPv4 address.`;
        break;
      }
      case "AAAA":
        if (!line.includes(":") || !IPV6.test(line)) return `'${line}' is not a valid IPv6 address.`;
        break;
      case "CNAME":
      case "PTR":
        if (!HOSTNAME.test(line)) return `'${line}' is not a valid domain name.`;
        break;
      case "NS":
        if (!line.endsWith(".") || !HOSTNAME.test(line)) return `'${line}' must be a domain name ending with a dot.`;
        break;
      case "MX": {
        const [pref, host, ...rest] = line.split(/\s+/);
        if (rest.length || !host || !isPort16(pref) || !(host === "." || HOSTNAME.test(host)))
          return `'${line}' must be in the format '<priority 0-65535> <mail server domain name>'.`;
        break;
      }
      case "SRV": {
        const [priority, weight, port, target, ...rest] = line.split(/\s+/);
        if (rest.length || !target || ![priority, weight, port].every(isPort16) || !(target === "." || HOSTNAME.test(target)))
          return `'${line}' must be in the format '<priority> <weight> <port> <target domain name>'.`;
        break;
      }
      case "CAA":
        if (!/^\d{1,3}\s+(issue|issuewild|iodef)\s+".+"$/.test(line) || Number(line.split(/\s+/)[0]) > 255)
          return `'${line}' must be in the format '<flags> <issue|issuewild|iodef> "<value>"'.`;
        break;
      case "TXT":
        if (line.replace(/^"|"$/g, "").length > 255) return "Each TXT string can have up to 255 characters.";
        break;
    }
  }
  return null;
}

const NAME_CHARS = /^[A-Za-z0-9_*@.-]*$/;
const POLICY_FIELD: Partial<Record<RoutingPolicy, keyof RecordBlockValues>> = {
  WEIGHTED: "weight",
  LATENCY: "region",
  FAILOVER: "failover",
  GEOLOCATION: "geoLocation",
};

function blockSchema(mode: "create" | "edit") {
  return z
    .object({
      name: z.string(),
      type: z.enum(RECORD_TYPES, { error: "Choose a record type." }),
      alias: z.boolean(),
      aliasDnsName: z.string(),
      aliasHostedZoneId: z.string(),
      evaluateTargetHealth: z.boolean(),
      valuesText: z.string(),
      ttl: z.string(),
      routingPolicy: z.enum(ROUTING_POLICIES),
      setIdentifier: z.string().max(128, "The record ID can have up to 128 characters."),
      weight: z.string(),
      region: z.string(),
      failover: z.enum(["", "PRIMARY", "SECONDARY"]),
      geoLocation: z.string(),
    })
    .superRefine((v, ctx) => {
      const fail = (path: keyof RecordBlockValues, message: string) => ctx.addIssue({ code: "custom", path: [path], message });

      if (mode === "create" && (!NAME_CHARS.test(v.name.trim()) || v.name.trim().length > 200)) {
        fail("name", "Record name can only contain letters, numbers, hyphens, underscores, dots, * and @.");
      }

      if (v.alias) {
        if (!ALIAS_TYPES.includes(v.type)) fail("alias", `Alias records are not supported for type ${v.type}.`);
        if (!v.aliasDnsName.trim()) fail("aliasDnsName", "Enter the DNS name to route traffic to.");
      } else {
        const error = validateValueLines(v.type, splitLines(v.valuesText));
        if (error) fail("valuesText", error);
        if (!/^\d+$/.test(v.ttl.trim()) || Number(v.ttl) > 2147483647) fail("ttl", "TTL must be a whole number of seconds (0 to 2147483647).");
      }

      if (v.routingPolicy !== "SIMPLE" && !v.setIdentifier.trim()) fail("setIdentifier", "Record ID is required for this routing policy.");
      const needed = POLICY_FIELD[v.routingPolicy];
      if (needed === "weight" && !(/^\d+$/.test(v.weight.trim()) && Number(v.weight) <= 255)) fail("weight", "Weight must be a whole number from 0 to 255.");
      if (needed === "region" && !v.region) fail("region", "Choose a region.");
      if (needed === "failover" && !v.failover) fail("failover", "Choose a failover record type.");
      if (needed === "geoLocation" && !GEO.test(v.geoLocation.trim()))
        fail("geoLocation", "Enter '*', a continent code (e.g. EU), a country code (e.g. US) or a subdivision (e.g. US-CA).");
    });
}

export const recordFormSchema = (mode: "create" | "edit") => z.object({ records: z.array(blockSchema(mode)).min(1) });

// --- form values -> API payloads --------------------------------------------------------------
function updateFields(v: RecordBlockValues): DnsRecordUpdate {
  const policy = v.routingPolicy;
  return {
    ttl: v.alias ? null : Number(v.ttl),
    values: v.alias ? [] : splitLines(v.valuesText),
    routing_policy: policy,
    set_identifier: policy === "SIMPLE" ? null : v.setIdentifier.trim(),
    weight: policy === "WEIGHTED" ? Number(v.weight) : null,
    region: policy === "LATENCY" ? v.region : null,
    failover: policy === "FAILOVER" && v.failover ? v.failover : null,
    geo_location: policy === "GEOLOCATION" ? v.geoLocation.trim() : null,
    alias_target: v.alias
      ? { dns_name: v.aliasDnsName.trim(), hosted_zone_id: v.aliasHostedZoneId, evaluate_target_health: v.evaluateTargetHealth }
      : null,
  };
}

export const toCreatePayload = (v: RecordBlockValues): DnsRecordCreate => ({
  name: v.name.trim() || "@",
  type: v.type,
  ...updateFields(v),
});

export const toUpdatePayload = updateFields;
