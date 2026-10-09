import pytest
from sqlalchemy import select

from app.models import Record

ZONES = "/api/v1/hostedzones"


@pytest.fixture()
def zone(auth_client):
    response = auth_client.post(ZONES, json={"name": "example.com", "type": "PUBLIC"})
    assert response.status_code == 201
    return response.json()


@pytest.fixture()
def url(zone):
    return f"{ZONES}/{zone['id']}/records"


def rec(name="www", type="A", values=("192.0.2.1",), ttl=300, **extra):
    return {"name": name, "type": type, "ttl": ttl, "values": list(values), **extra}


def system_record_id(db, zone, type_):
    return db.scalar(select(Record.id).where(Record.zone_id == zone["id"], Record.type == type_))


# (type, valid values, invalid values)
TYPE_CASES = [
    ("A", ["192.0.2.1", "10.0.0.1"], ["999.0.0.1"]),
    ("AAAA", ["2001:db8::1"], ["192.0.2.1"]),
    ("CNAME", ["target.example.org"], ["a.example.org", "b.example.org"]),
    ("TXT", ['"v=spf1 -all"', "plain text"], ["x" * 256]),
    ("MX", ["10 mail.example.com."], ["mail.example.com", "70000 mail.example.com."]),
    ("NS", ["ns1.example.net."], ["ns1.example.net"]),
    ("PTR", ["host.example.com."], ["not a host name"]),
    ("SRV", ["1 10 5060 sip.example.com."], ["1 10 sip.example.com."]),
    ("CAA", ['0 issue "letsencrypt.org"'], ['0 bogus "x"', "0 issue letsencrypt.org"]),
]


@pytest.mark.parametrize("type_,valid,invalid", TYPE_CASES, ids=[c[0] for c in TYPE_CASES])
def test_value_validation(auth_client, url, type_, valid, invalid):
    ok = auth_client.post(url, json=rec("sub", type_, valid))
    assert ok.status_code == 201, ok.text
    assert ok.json()["type"] == type_
    assert ok.json()["name"] == "sub.example.com."

    bad = auth_client.post(url, json=rec("other", type_, invalid))
    assert bad.status_code == 400, bad.text
    assert bad.json()["error"]["code"] == "InvalidInput"
    assert f"type {type_}" in bad.json()["error"]["message"] or type_ == "CNAME"


def test_txt_values_are_quoted(auth_client, url):
    body = auth_client.post(url, json=rec("t", "TXT", ["hello", '"already"'])).json()
    assert body["values"] == ['"hello"', '"already"']


def test_name_resolution(auth_client, url):
    names = {
        "@": "example.com.",
        "WWW": "www.example.com.",
        "a.b": "a.b.example.com.",
        "full.example.com": "full.example.com.",
        "dot.example.com.": "dot.example.com.",
        "*.wild": "*.wild.example.com.",
    }
    for i, (typed, expected) in enumerate(names.items()):
        response = auth_client.post(url, json=rec(typed, "TXT", [f"v{i}"]))
        assert response.status_code == 201, (typed, response.text)
        assert response.json()["name"] == expected

    # An empty name is also the apex.
    assert auth_client.post(url, json=rec("", "MX", ["10 mail.example.com."])).json()["name"] == "example.com."


def test_name_outside_zone_rejected(auth_client, url):
    response = auth_client.post(url, json=rec("www.other.org.", "A"))
    assert response.status_code == 400
    assert "not permitted in zone" in response.json()["error"]["message"]


def test_duplicate_rejected(auth_client, url):
    assert auth_client.post(url, json=rec()).status_code == 201
    response = auth_client.post(url, json=rec(values=["192.0.2.2"]))
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "InvalidChangeBatch"


def test_same_name_type_allowed_with_different_set_identifier(auth_client, url):
    weighted = {"routing_policy": "WEIGHTED"}
    a = rec(**weighted, set_identifier="one", weight=10)
    b = rec(values=["192.0.2.2"], **weighted, set_identifier="two", weight=20)
    assert auth_client.post(url, json=a).status_code == 201
    assert auth_client.post(url, json=b).status_code == 201
    assert auth_client.post(url, json=a).status_code == 409


def test_cname_exclusivity(auth_client, url):
    assert auth_client.post(url, json=rec("blog", "CNAME", ["x.example.org"])).status_code == 201
    other = auth_client.post(url, json=rec("blog", "A"))
    assert other.status_code == 409
    assert other.json()["error"]["code"] == "InvalidChangeBatch"

    assert auth_client.post(url, json=rec("host", "A")).status_code == 201
    assert auth_client.post(url, json=rec("host", "CNAME", ["x.example.org"])).status_code == 409
    # The apex already has SOA/NS, so a CNAME there is rejected too.
    assert auth_client.post(url, json=rec("@", "CNAME", ["x.example.org"])).status_code == 409


def test_alias_and_values_are_mutually_exclusive(auth_client, url):
    alias = {"dns_name": "d111.cloudfront.net", "hosted_zone_id": "Z2FDTNDATAQYW2", "evaluate_target_health": False}

    ok = auth_client.post(url, json={"name": "cdn", "type": "A", "alias_target": alias})
    assert ok.status_code == 201
    assert ok.json()["alias_target"] == alias
    assert ok.json()["ttl"] is None and ok.json()["values"] == []

    with_ttl = auth_client.post(url, json={"name": "a1", "type": "A", "ttl": 60, "alias_target": alias})
    with_values = auth_client.post(url, json={"name": "a2", "type": "A", "values": ["192.0.2.1"], "alias_target": alias})
    no_values = auth_client.post(url, json={"name": "a3", "type": "A", "ttl": 60, "values": []})
    no_ttl = auth_client.post(url, json={"name": "a4", "type": "A", "values": ["192.0.2.1"]})
    for response in (with_ttl, with_values, no_values, no_ttl):
        assert response.status_code == 400
        assert response.json()["error"]["code"] == "InvalidInput"


def test_routing_policy_requirements(auth_client, url):
    missing_id = auth_client.post(url, json=rec(routing_policy="WEIGHTED", weight=1))
    missing_weight = auth_client.post(url, json=rec(routing_policy="WEIGHTED", set_identifier="a"))
    simple_with_id = auth_client.post(url, json=rec(set_identifier="a"))
    geo = auth_client.post(url, json=rec(routing_policy="GEOLOCATION", set_identifier="us", geo_location="us-ca"))
    assert [r.status_code for r in (missing_id, missing_weight, simple_with_id)] == [400, 400, 400]
    assert geo.status_code == 201
    assert geo.json()["geo_location"] == "US-CA"
    assert geo.json()["set_identifier"] == "us"


def test_batch_create(auth_client, url):
    response = auth_client.post(url, json={"records": [rec("a1"), rec("a2", "TXT", ["x"])]})
    assert response.status_code == 201
    assert [r["name"] for r in response.json()["records"]] == ["a1.example.com.", "a2.example.com."]


def test_batch_is_all_or_nothing(auth_client, url, db_session):
    batch = {"records": [rec("good1"), rec("good2"), rec("bad", "A", ["nope"])]}
    response = auth_client.post(url, json=batch)
    assert response.status_code == 400
    assert response.json()["error"]["message"].startswith("Record 3 of 3 (bad A):")
    names = db_session.scalars(select(Record.name).where(Record.is_system.is_(False))).all()
    assert names == []

    duplicate = {"records": [rec("same"), rec("same", values=["192.0.2.9"])]}
    assert auth_client.post(url, json=duplicate).status_code == 409
    assert db_session.scalars(select(Record.name).where(Record.is_system.is_(False))).all() == []


def test_get_and_update_record(auth_client, url):
    created = auth_client.post(url, json=rec()).json()
    assert auth_client.get(f"{url}/{created['id']}").json()["id"] == created["id"]

    response = auth_client.put(f"{url}/{created['id']}", json={"ttl": 60, "values": ["192.0.2.50"]})
    assert response.status_code == 200
    assert response.json()["values"] == ["192.0.2.50"] and response.json()["ttl"] == 60
    assert response.json()["name"] == "www.example.com." and response.json()["type"] == "A"

    invalid = auth_client.put(f"{url}/{created['id']}", json={"ttl": 60, "values": ["nope"]})
    assert invalid.status_code == 400


def test_update_cannot_change_name_or_type_by_design(auth_client, url):
    created = auth_client.post(url, json=rec()).json()
    response = auth_client.put(
        f"{url}/{created['id']}", json={"name": "other", "type": "TXT", "ttl": 60, "values": ["192.0.2.50"]}
    )
    assert response.json()["name"] == "www.example.com." and response.json()["type"] == "A"


def test_update_blocked_on_system_record(auth_client, url, zone, db_session):
    ns_id = system_record_id(db_session, zone, "NS")
    response = auth_client.put(f"{url}/{ns_id}", json={"ttl": 60, "values": ["ns1.example.net."]})
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "CannotEditSystemRecord"


def test_delete_record_and_system_blocked(auth_client, url, zone, db_session):
    created = auth_client.post(url, json=rec()).json()
    assert auth_client.delete(f"{url}/{created['id']}").status_code == 204
    assert auth_client.get(f"{url}/{created['id']}").status_code == 404

    soa_id = system_record_id(db_session, zone, "SOA")
    response = auth_client.delete(f"{url}/{soa_id}")
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "CannotDeleteSystemRecord"


def test_zone_delete_allowed_again_after_records_removed(auth_client, url, zone):
    created = auth_client.post(url, json=rec()).json()
    assert auth_client.delete(f"{ZONES}/{zone['id']}").status_code == 409
    auth_client.delete(f"{url}/{created['id']}")
    assert auth_client.delete(f"{ZONES}/{zone['id']}").status_code == 204


def test_bulk_delete_mixed(auth_client, url, zone, db_session):
    a = auth_client.post(url, json=rec("a")).json()["id"]
    b = auth_client.post(url, json=rec("b")).json()["id"]
    soa = system_record_id(db_session, zone, "SOA")

    response = auth_client.post(f"{url}/bulk-delete", json={"ids": [a, b, soa, 99999]})
    assert response.status_code == 200
    body = response.json()
    assert body["deleted"] == [a, b]
    failures = {f["id"]: f["error"] for f in body["failed"]}
    assert set(failures) == {soa, 99999}
    assert "cannot be deleted" in failures[soa]
    assert auth_client.get(f"{url}/{a}").status_code == 404


def test_list_search_filter_pagination(auth_client, url):
    auth_client.post(url, json={"records": [rec("web1"), rec("web2"), rec("mail", "TXT", ["x"])]})
    auth_client.post(url, json=rec("lb", routing_policy="WEIGHTED", set_identifier="a", weight=1))

    everything = auth_client.get(url, params={"page_size": 100}).json()
    assert everything["total"] == 6  # SOA + NS + 4 created

    assert {r["name"] for r in auth_client.get(url, params={"search": "WEB"}).json()["items"]} == {
        "web1.example.com.",
        "web2.example.com.",
    }
    assert auth_client.get(url, params={"type": "TXT"}).json()["total"] == 1
    assert auth_client.get(url, params={"type": "SOA"}).json()["total"] == 1
    assert auth_client.get(url, params={"routing_policy": "WEIGHTED"}).json()["total"] == 1

    page = auth_client.get(url, params={"page": 2, "page_size": 4}).json()
    assert page["total"] == 6 and len(page["items"]) == 2 and page["page"] == 2
    assert auth_client.get(url, params={"type": "BOGUS"}).status_code == 400


def test_wrong_zone_and_unknown_zone(auth_client, url):
    other = auth_client.post(ZONES, json={"name": "other.org", "type": "PUBLIC"}).json()
    created = auth_client.post(url, json=rec()).json()

    cross = f"{ZONES}/{other['id']}/records/{created['id']}"
    assert auth_client.get(cross).status_code == 404
    assert auth_client.delete(cross).status_code == 404
    assert auth_client.get(cross).json()["error"]["code"] == "NoSuchRecord"

    missing = f"{ZONES}/ZMISSING/records"
    assert auth_client.get(missing).status_code == 404
    assert auth_client.get(missing).json()["error"]["code"] == "NoSuchHostedZone"
    assert auth_client.post(missing, json=rec()).status_code == 404


def test_requires_auth(client):
    assert client.get(f"{ZONES}/ZABC/records").status_code == 401


def test_creating_record_bumps_zone_updated_at(auth_client, url, zone):
    auth_client.post(url, json=rec())
    after = auth_client.get(f"{ZONES}/{zone['id']}").json()
    assert after["updated_at"] > zone["updated_at"]
    assert after["record_count"] == 3


def test_seed_records_cover_all_types_and_are_idempotent(db_session):
    from app.seed import seed_demo_user, seed_sample_records, seed_sample_zones

    user, _ = seed_demo_user(db_session)
    seed_sample_zones(db_session, user)
    first = seed_sample_records(db_session, user)
    assert first >= 8
    assert seed_sample_records(db_session, user) == 0
    types = set(db_session.scalars(select(Record.type)))
    assert types >= {"A", "AAAA", "CNAME", "TXT", "MX", "NS", "SRV", "CAA", "SOA"}
