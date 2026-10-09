import re

import pytest
from sqlalchemy import select

from app.models import HostedZone, Record, User
from app.schemas.hosted_zone import HostedZoneCreate
from app.services.auth_service import hash_password
from app.services.zone_service import create_zone

BASE = "/api/v1/hostedzones"
VPC = {"region": "us-east-1", "vpc_id": "vpc-0a1b2c3d4e5f6a7b8"}


def make_zone(client, name="example.com", **extra):
    response = client.post(BASE, json={"name": name, "type": "PUBLIC", **extra})
    assert response.status_code == 201, response.text
    return response.json()


def add_user_record(db, zone_id):
    db.add(Record(zone_id=zone_id, name="www.example.com.", type="A", ttl=300, values=["192.0.2.1"]))
    db.commit()


def test_requires_auth(client):
    assert client.get(BASE).status_code == 401
    assert client.post(BASE, json={"name": "a.com"}).status_code == 401


def test_create_public_zone(auth_client):
    zone = make_zone(auth_client, "Example.COM", comment="Prod")
    assert re.fullmatch(r"Z[A-Z0-9]{20}", zone["id"])
    assert zone["name"] == "example.com."
    assert zone["type"] == "PUBLIC"
    assert zone["comment"] == "Prod"
    assert zone["record_count"] == 2
    assert zone["vpcs"] == []


def test_create_private_zone(auth_client):
    zone = make_zone(auth_client, "corp.internal", type="PRIVATE", vpcs=[VPC])
    assert zone["type"] == "PRIVATE"
    assert zone["vpcs"] == [VPC]


def test_private_zone_requires_vpc(auth_client):
    response = auth_client.post(BASE, json={"name": "corp.internal", "type": "PRIVATE"})
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "InvalidInput"


def test_public_zone_rejects_vpc(auth_client):
    response = auth_client.post(BASE, json={"name": "example.com", "type": "PUBLIC", "vpcs": [VPC]})
    assert response.status_code == 400


def test_invalid_zone_name(auth_client):
    response = auth_client.post(BASE, json={"name": "not a domain!", "type": "PUBLIC"})
    assert response.status_code == 400


def test_create_adds_system_soa_and_ns(auth_client, db_session):
    zone = make_zone(auth_client)
    records = db_session.scalars(select(Record).where(Record.zone_id == zone["id"])).all()
    by_type = {r.type: r for r in records}
    assert set(by_type) == {"SOA", "NS"}
    assert all(r.is_system and r.name == "example.com." for r in records)
    ns = by_type["NS"].values
    assert len(ns) == 4
    assert ns[0].endswith(".com.") and ns[1].endswith(".net.") and ns[2].endswith(".org.") and ns[3].endswith(".co.uk.")
    assert by_type["SOA"].values[0].startswith(ns[0])


def test_list_search_filter_pagination(auth_client):
    make_zone(auth_client, "alpha.com")
    make_zone(auth_client, "beta.com")
    make_zone(auth_client, "gamma.org")
    make_zone(auth_client, "alpha.internal", type="PRIVATE", vpcs=[VPC])

    everything = auth_client.get(BASE).json()
    assert everything["total"] == 4
    assert [z["name"] for z in everything["items"]] == ["alpha.com.", "alpha.internal.", "beta.com.", "gamma.org."]
    assert everything["items"][0]["record_count"] == 2

    assert [z["name"] for z in auth_client.get(BASE, params={"search": "ALPHA"}).json()["items"]] == [
        "alpha.com.",
        "alpha.internal.",
    ]
    private = auth_client.get(BASE, params={"type": "PRIVATE"}).json()
    assert [z["name"] for z in private["items"]] == ["alpha.internal."]

    page2 = auth_client.get(BASE, params={"page": 2, "page_size": 3}).json()
    assert page2["total"] == 4 and page2["page"] == 2 and page2["page_size"] == 3
    assert [z["name"] for z in page2["items"]] == ["gamma.org."]

    desc = auth_client.get(BASE, params={"sort": "-name"}).json()
    assert desc["items"][0]["name"] == "gamma.org."
    assert auth_client.get(BASE, params={"sort": "bogus"}).status_code == 400


def test_list_is_scoped_to_user(auth_client, db_session):
    make_zone(auth_client, "mine.com")
    other = User(email="o@example.com", password_hash=hash_password("x"), display_name="O", account_id="111111111111")
    db_session.add(other)
    db_session.commit()
    theirs = create_zone(db_session, other.id, HostedZoneCreate(name="theirs.com"))

    assert auth_client.get(BASE).json()["total"] == 1
    assert auth_client.get(f"{BASE}/{theirs.id}").status_code == 404
    assert auth_client.delete(f"{BASE}/{theirs.id}").status_code == 404


def test_get_zone_and_404(auth_client):
    zone = make_zone(auth_client)
    assert auth_client.get(f"{BASE}/{zone['id']}").json()["id"] == zone["id"]

    response = auth_client.get(f"{BASE}/ZDOESNOTEXIST000000000")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NoSuchHostedZone"


def test_update_comment(auth_client):
    zone = make_zone(auth_client, comment="old")
    response = auth_client.patch(f"{BASE}/{zone['id']}", json={"comment": "new"})
    assert response.status_code == 200
    assert response.json()["comment"] == "new"

    cleared = auth_client.patch(f"{BASE}/{zone['id']}", json={"comment": None}).json()
    assert cleared["comment"] == ""


def test_update_vpcs_private_only(auth_client):
    private = make_zone(auth_client, "corp.internal", type="PRIVATE", vpcs=[VPC])
    new_vpc = {"region": "eu-west-1", "vpc_id": "vpc-11112222"}
    updated = auth_client.patch(f"{BASE}/{private['id']}", json={"vpcs": [new_vpc]}).json()
    assert updated["vpcs"] == [new_vpc]
    assert auth_client.patch(f"{BASE}/{private['id']}", json={"vpcs": []}).status_code == 400

    public = make_zone(auth_client)
    response = auth_client.patch(f"{BASE}/{public['id']}", json={"vpcs": [VPC]})
    assert response.status_code == 400


def test_delete_zone(auth_client, db_session):
    zone = make_zone(auth_client)
    assert auth_client.delete(f"{BASE}/{zone['id']}").status_code == 204
    assert auth_client.get(f"{BASE}/{zone['id']}").status_code == 404
    assert db_session.scalars(select(Record).where(Record.zone_id == zone["id"])).all() == []


def test_delete_blocked_when_not_empty(auth_client, db_session):
    zone = make_zone(auth_client)
    add_user_record(db_session, zone["id"])

    response = auth_client.delete(f"{BASE}/{zone['id']}")
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "HostedZoneNotEmpty"
    assert auth_client.get(f"{BASE}/{zone['id']}").status_code == 200


def test_bulk_delete_mixed(auth_client, db_session):
    empty = make_zone(auth_client, "empty.com")
    busy = make_zone(auth_client, "busy.com")
    add_user_record(db_session, busy["id"])

    response = auth_client.post(BASE + "/bulk-delete", json={"ids": [empty["id"], busy["id"], "ZMISSING"]})
    assert response.status_code == 200
    body = response.json()
    assert body["deleted"] == [empty["id"]]
    assert {f["id"] for f in body["failed"]} == {busy["id"], "ZMISSING"}
    assert next(f for f in body["failed"] if f["id"] == busy["id"])["error"].startswith("The specified hosted zone")


def test_tags_get_and_replace(auth_client):
    zone = make_zone(auth_client)
    url = f"{BASE}/{zone['id']}/tags"
    assert auth_client.get(url).json() == {"tags": {}}

    assert auth_client.put(url, json={"tags": {"env": "prod", "team": "web"}}).json() == {
        "tags": {"env": "prod", "team": "web"}
    }
    # Replacing reuses the "env" key and drops "team".
    assert auth_client.put(url, json={"tags": {"env": "dev"}}).json() == {"tags": {"env": "dev"}}
    assert auth_client.get(url).json() == {"tags": {"env": "dev"}}
    assert auth_client.get(f"{BASE}/ZMISSING/tags").status_code == 404


def test_seed_sample_zones_idempotent(db_session):
    from app.seed import seed_demo_user, seed_sample_zones

    user, _ = seed_demo_user(db_session)
    assert seed_sample_zones(db_session, user) == 3
    assert seed_sample_zones(db_session, user) == 0
    zones = db_session.scalars(select(HostedZone).where(HostedZone.user_id == user.id)).all()
    assert {z.is_private for z in zones} == {True, False}
    assert all(len(z.records) == 2 for z in zones)
