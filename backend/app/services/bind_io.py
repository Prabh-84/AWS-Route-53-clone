"""BIND zone file / JSON import and export.

Import is a small hand-rolled parser (rather than dns.zone.from_text) so that one bad line is
reported and skipped instead of failing the whole file. dnspython is still used for TTL parsing.
"""

import json
import re
from dataclasses import dataclass, field
from typing import Any

import dns.exception
import dns.ttl

from app.models import HostedZone, Record

SUPPORTED_TYPES = {"A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA"}
DEFAULT_TTL = 300
MAX_IMPORT_BYTES = 1_000_000
_CLASSES = {"IN", "CH", "HS"}
_TTL_TOKEN = re.compile(r"^\d+[smhdwSMHDW]?$")


@dataclass
class ParsedRecord:
    line: int
    name: str  # absolute, lowercase, trailing dot
    type: str
    ttl: int
    values: list[str]
    extra: dict[str, Any] = field(default_factory=dict)  # routing fields etc. (JSON import only)


@dataclass
class ParsedSkip:
    line: int | None
    record: str
    reason: str


@dataclass
class ParsedZone:
    records: list[ParsedRecord] = field(default_factory=list)
    skipped: list[ParsedSkip] = field(default_factory=list)


# --- tokenizing ---------------------------------------------------------------------------------
def _tokenize_line(line: str) -> list[str]:
    """Split a physical line into tokens: quoted strings stay whole (with quotes), ';' starts a comment,
    and '(' / ')' are separate tokens."""
    tokens: list[str] = []
    current: list[str] = []
    in_quote = False
    escaped = False
    for ch in line:
        if in_quote:
            current.append(ch)
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == '"':
                in_quote = False
            continue
        if ch == '"':
            current.append(ch)
            in_quote = True
        elif ch == ";":
            break
        elif ch in "()":
            if current:
                tokens.append("".join(current))
                current = []
            tokens.append(ch)
        elif ch.isspace():
            if current:
                tokens.append("".join(current))
                current = []
        else:
            current.append(ch)
    if current:
        tokens.append("".join(current))
    return tokens


def _logical_lines(text: str):
    """Yield (line_number, starts_with_whitespace, tokens), joining lines grouped by ( ... )."""
    depth = 0
    start_line = 0
    leading_space = False
    pending: list[str] = []
    for number, raw in enumerate(text.splitlines(), start=1):
        tokens = _tokenize_line(raw)
        if depth == 0:
            start_line, leading_space, pending = number, raw[:1] in (" ", "\t"), []
        for token in tokens:
            if token == "(":
                depth += 1
            elif token == ")":
                depth = max(0, depth - 1)
            else:
                pending.append(token)
        if depth == 0:
            if pending:
                yield start_line, leading_space, pending
            pending = []
    if pending:  # unterminated '('
        yield start_line, leading_space, pending


# --- parsing ------------------------------------------------------------------------------------
def _absolute(name: str, origin: str) -> str:
    if name == "@":
        return origin
    return name.lower() if name.endswith(".") else f"{name.lower()}.{origin}"


def _expand_rdata(record_type: str, rdata: list[str], origin: str) -> list[str]:
    """Make relative target names absolute (BIND treats names without a trailing dot as relative to $ORIGIN)."""
    tokens = list(rdata)
    target_index = {"CNAME": 0, "NS": 0, "PTR": 0, "MX": 1, "SRV": 3}.get(record_type)
    if target_index is not None and target_index < len(tokens):
        target = tokens[target_index]
        if target != "." and not target.endswith("."):
            tokens[target_index] = _absolute(target, origin)
    return tokens


def _parse_ttl(token: str) -> int:
    return dns.ttl.from_text(token)


def parse_bind_zone(text: str, zone_name: str) -> ParsedZone:
    origin = zone_name.lower() if zone_name.endswith(".") else zone_name.lower() + "."
    result = ParsedZone()
    default_ttl: int | None = None
    last_owner: str | None = None
    grouped: dict[tuple[str, str], ParsedRecord] = {}

    def skip(line: int, record: str, reason: str) -> None:
        result.skipped.append(ParsedSkip(line=line, record=record, reason=reason))

    for line, leading_space, tokens in _logical_lines(text):
        head = tokens[0]
        if head.startswith("$"):
            directive = head.upper()
            if directive == "$ORIGIN" and len(tokens) >= 2:
                origin = tokens[1].lower() if tokens[1].endswith(".") else f"{tokens[1].lower()}.{origin}"
            elif directive == "$TTL" and len(tokens) >= 2:
                try:
                    default_ttl = _parse_ttl(tokens[1])
                except (dns.exception.DNSException, ValueError):
                    skip(line, head, f"Invalid $TTL value '{tokens[1]}'.")
            else:
                skip(line, head, f"Unsupported directive {head}.")
            continue

        index = 0
        if leading_space:
            if last_owner is None:
                skip(line, " ".join(tokens), "Record has no owner name.")
                continue
            owner = last_owner
        else:
            owner = _absolute(head, origin)
            last_owner = owner
            index = 1

        ttl: int | None = None
        while index < len(tokens):
            token = tokens[index]
            if token.upper() in _CLASSES:
                index += 1
            elif _TTL_TOKEN.match(token):
                try:
                    ttl = _parse_ttl(token)
                except (dns.exception.DNSException, ValueError):
                    skip(line, " ".join(tokens), f"Invalid TTL '{token}'.")
                    ttl = None
                    index = len(tokens)
                    break
                index += 1
            else:
                break
        if index >= len(tokens):
            if not any(s.line == line for s in result.skipped):
                skip(line, " ".join(tokens), "Missing record type.")
            continue

        record_type = tokens[index].upper()
        rdata = tokens[index + 1 :]
        label = f"{owner} {record_type}"

        if record_type == "SOA":
            skip(line, label, "The SOA record is managed by Route 53.")
        elif record_type not in SUPPORTED_TYPES:
            skip(line, label, f"Unsupported record type {record_type}.")
        elif not rdata:
            skip(line, label, "Record has no value.")
        elif record_type == "NS" and owner == origin:
            skip(line, label, "The apex NS record is managed by Route 53.")
        else:
            value = " ".join(_expand_rdata(record_type, rdata, origin))
            existing = grouped.get((owner, record_type))
            if existing:
                existing.values.append(value)
            else:
                record = ParsedRecord(line, owner, record_type, ttl or default_ttl or DEFAULT_TTL, [value])
                grouped[(owner, record_type)] = record
                result.records.append(record)
    return result


_JSON_FIELDS = ("routing_policy", "set_identifier", "weight", "region", "failover", "geo_location", "alias_target", "health_check_id")


def parse_json_zone(text: str, zone_name: str) -> ParsedZone:
    """Read a document produced by export_json_zone."""
    result = ParsedZone()
    try:
        document = json.loads(text)
        items = document["records"]
        if not isinstance(items, list):
            raise TypeError
    except (ValueError, KeyError, TypeError):
        result.skipped.append(ParsedSkip(None, "document", "Not a valid zone export: expected a JSON object with a 'records' array."))
        return result
    origin = zone_name.lower() if zone_name.endswith(".") else zone_name.lower() + "."
    for number, item in enumerate(items, start=1):
        if not isinstance(item, dict) or "name" not in item or "type" not in item:
            result.skipped.append(ParsedSkip(number, f"records[{number - 1}]", "Record needs a name and a type."))
            continue
        name = _absolute(str(item["name"]), origin)
        record_type = str(item["type"]).upper()
        label = f"{name} {record_type}"
        if item.get("is_system") or record_type == "SOA":
            result.skipped.append(ParsedSkip(number, label, "System records are managed by Route 53."))
        elif record_type not in SUPPORTED_TYPES:
            result.skipped.append(ParsedSkip(number, label, f"Unsupported record type {record_type}."))
        else:
            ttl = item.get("ttl")
            result.records.append(
                ParsedRecord(
                    number, name, record_type, ttl if isinstance(ttl, int) else DEFAULT_TTL,
                    [str(v) for v in item.get("values", [])],
                    {k: item[k] for k in _JSON_FIELDS if item.get(k) not in (None, "")},
                )
            )
    return result


def parse_import(text: str, zone_name: str) -> ParsedZone:
    """Parse an uploaded zone: a JSON export if it starts with '{', otherwise BIND zone file text."""
    if text.lstrip().startswith("{"):
        return parse_json_zone(text, zone_name)
    return parse_bind_zone(text, zone_name)


# --- export -------------------------------------------------------------------------------------
def _sorted_records(records: list[Record]) -> list[Record]:
    """System records first (SOA, then NS), then everything else by name and type."""
    return sorted(records, key=lambda r: (not r.is_system, r.type != "SOA", r.name, r.type, r.set_identifier))


def export_bind_zone(zone: HostedZone, records: list[Record]) -> str:
    lines = [
        f"; Zone file for {zone.name}",
        f"; Exported from the Route 53 console clone ({'private' if zone.is_private else 'public'} hosted zone {zone.id})",
        f"$ORIGIN {zone.name}",
        f"$TTL {DEFAULT_TTL}",
        "",
    ]
    for record in _sorted_records(records):
        if record.alias_target:
            target = record.alias_target.get("dns_name", "")
            lines.append(f"; alias record not representable in BIND format: {record.name} {record.type} -> {target}")
            continue
        note = ""
        if record.routing_policy != "SIMPLE":
            note = f" ; routing={record.routing_policy} set-id={record.set_identifier}"
        for value in record.values:
            lines.append(f"{record.name} {record.ttl} IN {record.type} {value}{note}")
    return "\n".join(lines) + "\n"


def export_json_zone(zone: HostedZone, records: list[Record]) -> dict[str, Any]:
    return {
        "zone": {
            "id": zone.id,
            "name": zone.name,
            "type": "PRIVATE" if zone.is_private else "PUBLIC",
            "comment": zone.comment,
            "vpcs": [{"region": v.region, "vpc_id": v.vpc_id} for v in zone.vpcs],
            "tags": {t.key: t.value for t in zone.tags},
            "created_at": zone.created_at.isoformat(),
            "updated_at": zone.updated_at.isoformat(),
        },
        "records": [
            {
                "name": r.name,
                "type": r.type,
                "ttl": r.ttl,
                "values": r.values,
                "routing_policy": r.routing_policy,
                "set_identifier": r.set_identifier or None,
                "weight": r.weight,
                "region": r.region,
                "failover": r.failover,
                "geo_location": (r.geo_location or {}).get("location"),
                "alias_target": r.alias_target,
                "health_check_id": r.health_check_id,
                "is_system": r.is_system,
            }
            for r in _sorted_records(records)
        ],
    }
