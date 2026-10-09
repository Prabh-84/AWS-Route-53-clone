import json

import pytest

from app.services.bind_io import parse_bind_zone

ZONES = "/api/v1/hostedzones"

ZONE_FILE = """\
$ORIGIN example.com.
$TTL 3600
@       IN  SOA ns1.example.com. admin.example.com. (
            2024010101 ; serial
            7200       ; refresh
            900        ; retry
            1209600    ; expire
            86400 )    ; minimum
@       IN  NS  ns1.example.com.      ; apex NS is managed by Route 53
@       300 IN  A   192.0.2.1
www     IN  A   192.0.2.2
        IN  A   192.0.2.3             ; blank owner = previous owner
www     IN  AAAA 2001:db8::1
blog    5m  IN  CNAME www              ; relative target
@       IN  MX  10 mail
mail    IN  A   192.0.2.25
@       IN  TXT "v=spf1 mx ~all"
_sip._tcp IN SRV 10 60 5060 sip.example.com.
@       IN  CAA 0 issue "letsencrypt.org"
bad     IN  A   not-an-ip
weird   IN  LOC 52 22 23.000 N 4 53 32.000 E -2.00m
other.org. IN A 192.0.2.99
"""


@pytest.fixture()
def zone(auth_client):
    response = auth_client.post(ZONES, json={"name": "example.com", "type": "PUBLIC"})
    assert response.status_code == 201
    return response.json()


def post_import(client, zone_id, text, dry_run=True):
    return client.post(
        f"{ZONES}/{zone_id}/import",
        params={"dry_run": str(dry_run).lower()},
        content=text,
        headers={"Content-Type": "text/plain"},
    )


def user_records(client, zone_id):
    items = client.get(f"{ZONES}/{zone_id}/records", params={"page_size": 100}).json()["items"]
    return {(r["name"], r["type"]): r for r in items if not r["is_system"]}


# --- parser (no DB) -------------------------------------------------------------------------------
def test_parse_extracts_records_and_reports_skips():
    parsed = parse_bind_zone(ZONE_FILE, "example.com.")
    by_key = {(r.name, r.type): r for r in parsed.records}

    assert by_key[("example.com.", "A")].values == ["192.0.2.1"]
    assert by_key[("example.com.", "A")].ttl == 300  # explicit TTL beats $TTL
    assert by_key[("www.example.com.", "A")].values == ["192.0.2.2", "192.0.2.3"]  # grouped, blank owner reused
    assert by_key[("www.example.com.", "A")].ttl == 3600  # default from $TTL
    assert by_key[("blog.example.com.", "CNAME")].values == ["www.example.com."]  # relative target expanded
    assert by_key[("blog.example.com.", "CNAME")].ttl == 300  # "5m"
    assert by_key[("example.com.", "MX")].values == ["10 mail.example.com."]
    assert by_key[("example.com.", "TXT")].values == ['"v=spf1 mx ~all"']
    assert by_key[("_sip._tcp.example.com.", "SRV")].values == ["10 60 5060 sip.example.com."]
    assert by_key[("example.com.", "CAA")].values == ['0 issue "letsencrypt.org"']

    reasons = {s.record: s.reason for s in parsed.skipped}
    assert "SOA" in reasons["example.com. SOA"]
    assert "apex NS" in reasons["example.com. NS"]
    assert "Unsupported record type LOC" in reasons["weird.example.com. LOC"]


def test_parse_handles_garbage_without_crashing():
    parsed = parse_bind_zone('$BOGUS x\n"unterminated\n   \n(((\n$TTL nope\n', "example.com.")
    assert parsed.records == []
    assert parsed.skipped  # reported, not raised


# --- import endpoint ------------------------------------------------------------------------------
def test_dry_run_previews_without_saving(auth_client, zone):
    response = post_import(auth_client, zone["id"], ZONE_FILE, dry_run=True)
    assert response.status_code == 200
    body = response.json()
    assert body["dry_run"] is True

    created = {(r["name"], r["type"]) for r in body["would_create"]}
    assert ("www.example.com.", "A") in created and ("_sip._tcp.example.com.", "SRV") in created
    skipped = {s["record"]: s["reason"] for s in body["would_skip"]}
    assert "bad.example.com. A" in skipped and "IPv4" in skipped["bad.example.com. A"]
    assert "not permitted in zone" in skipped["other.org. A"]
    assert "Unsupported record type LOC" in skipped["weird.example.com. LOC"]
    assert all(s["line"] for s in body["would_skip"])

    assert user_records(auth_client, zone["id"]) == {}  # nothing was written
    assert auth_client.get(f"{ZONES}/{zone['id']}").json()["record_count"] == 2


def test_real_import_creates_valid_records_and_skips_bad_lines(auth_client, zone):
    body = post_import(auth_client, zone["id"], ZONE_FILE, dry_run=False).json()
    assert body["dry_run"] is False
    assert len(body["created"]) == 9
    skipped = {s["record"] for s in body["skipped"]}
    assert {"bad.example.com. A", "other.org. A", "weird.example.com. LOC", "example.com. SOA", "example.com. NS"} <= skipped

    records = user_records(auth_client, zone["id"])
    assert records[("www.example.com.", "A")]["values"] == ["192.0.2.2", "192.0.2.3"]
    assert records[("blog.example.com.", "CNAME")]["ttl"] == 300
    assert ("bad.example.com.", "A") not in records
    assert auth_client.get(f"{ZONES}/{zone['id']}").json()["record_count"] == 2 + 9


def test_import_skips_duplicates_and_cname_conflicts(auth_client, zone):
    post_import(auth_client, zone["id"], "www IN A 192.0.2.1\n", dry_run=False)
    body = post_import(auth_client, zone["id"], "www IN A 192.0.2.9\nwww IN CNAME other.example.com.\nnew IN A 192.0.2.4\n", dry_run=False).json()
    assert [r["name"] for r in body["created"]] == ["new.example.com."]
    reasons = {s["record"]: s["reason"] for s in body["skipped"]}
    assert "already exists" in reasons["www.example.com. A"]
    assert "CNAME" in reasons["www.example.com. CNAME"]


def test_import_is_scoped_and_validated(auth_client, zone):
    assert post_import(auth_client, "ZMISSING", "a IN A 192.0.2.1\n").status_code == 404
    assert post_import(auth_client, zone["id"], "x" * 1_100_000).status_code == 400
    assert auth_client.post(f"{ZONES}/{zone['id']}/import", content="a IN A 192.0.2.1").status_code == 200  # dry run by default
    assert user_records(auth_client, zone["id"]) == {}


# --- export ---------------------------------------------------------------------------------------
def test_export_json_then_reimport_round_trips(auth_client, zone):
    post_import(auth_client, zone["id"], ZONE_FILE, dry_run=False)
    auth_client.post(
        f"{ZONES}/{zone['id']}/records",
        json={"name": "api", "type": "A", "ttl": 60, "values": ["192.0.2.50"], "routing_policy": "WEIGHTED", "set_identifier": "a", "weight": 70},
    )

    response = auth_client.get(f"{ZONES}/{zone['id']}/export", params={"format": "json"})
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/json")
    assert response.headers["content-disposition"] == 'attachment; filename="example.com.json"'
    document = json.loads(response.text)
    assert document["zone"]["name"] == "example.com."
    assert [r["type"] for r in document["records"][:2]] == ["SOA", "NS"]  # system records first

    other = auth_client.post(ZONES, json={"name": "example.com", "type": "PUBLIC"}).json()
    summary = post_import(auth_client, other["id"], response.text, dry_run=False).json()
    assert summary["skipped"] and all("System records" in s["reason"] for s in summary["skipped"])

    def strip(records):
        return {k: {f: v[f] for f in ("ttl", "values", "routing_policy", "set_identifier", "weight")} for k, v in records.items()}

    assert strip(user_records(auth_client, other["id"])) == strip(user_records(auth_client, zone["id"]))


def test_export_bind_format(auth_client, zone):
    post_import(auth_client, zone["id"], ZONE_FILE, dry_run=False)
    response = auth_client.get(f"{ZONES}/{zone['id']}/export", params={"format": "bind"})
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/dns")
    assert response.headers["content-disposition"] == 'attachment; filename="example.com.zone"'

    lines = [line for line in response.text.splitlines() if line and not line.startswith(";")]
    assert lines[0] == "$ORIGIN example.com."
    assert lines[2].startswith("example.com. 900 IN SOA ns-")  # SOA first, then NS
    assert lines[3].startswith("example.com. 172800 IN NS ns-")
    assert "www.example.com. 3600 IN A 192.0.2.2" in lines
    assert 'example.com. 3600 IN TXT "v=spf1 mx ~all"' in lines

    # The export is itself a valid import: every user record is accepted into a fresh zone.
    other = auth_client.post(ZONES, json={"name": "example.com", "type": "PUBLIC"}).json()
    summary = post_import(auth_client, other["id"], response.text, dry_run=False).json()
    assert len(summary["created"]) == 9
    assert {(s["record"]) for s in summary["skipped"]} == {"example.com. SOA", "example.com. NS"}


def test_export_requires_valid_format_and_ownership(auth_client, zone):
    assert auth_client.get(f"{ZONES}/{zone['id']}/export", params={"format": "xml"}).status_code == 400
    assert auth_client.get(f"{ZONES}/ZMISSING/export").status_code == 404
