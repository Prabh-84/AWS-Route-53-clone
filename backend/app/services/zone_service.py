import random
import secrets
import string

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models import HostedZone, Record, ZoneTag, ZoneVpc
from app.schemas.hosted_zone import (
    BulkDeleteFailure,
    BulkDeleteResult,
    HostedZoneCreate,
    HostedZoneListItem,
    HostedZoneOut,
    HostedZoneUpdate,
    PaginatedZones,
    VpcIn,
    VpcOut,
)

_ID_ALPHABET = string.ascii_uppercase + string.digits
_TLDS = ("com", "net", "org", "co.uk")
_SORTS = {
    "name": HostedZone.name.asc(),
    "-name": HostedZone.name.desc(),
    "created_at": HostedZone.created_at.asc(),
    "-created_at": HostedZone.created_at.desc(),
}
_NS_TTL = 172800
_SOA_TTL = 900


def generate_zone_id() -> str:
    return "Z" + "".join(secrets.choice(_ID_ALPHABET) for _ in range(20))


def generate_name_servers() -> list[str]:
    return [f"ns-{random.randint(1, 2048)}.awsdns-{random.randint(10, 99)}.{tld}" for tld in _TLDS]


def _not_found(zone_id: str) -> AppError:
    return AppError("NoSuchHostedZone", f"No hosted zone found with ID: {zone_id}", 404)


def get_owned_zone(db: Session, owner_id: int, zone_id: str) -> HostedZone:
    zone = db.scalar(select(HostedZone).where(HostedZone.id == zone_id, HostedZone.user_id == owner_id))
    if zone is None:
        raise _not_found(zone_id)
    return zone


def _record_count_subquery():
    return (
        select(func.count(Record.id)).where(Record.zone_id == HostedZone.id).correlate(HostedZone).scalar_subquery()
    )


def _record_count(db: Session, zone_id: str) -> int:
    return db.scalar(select(func.count(Record.id)).where(Record.zone_id == zone_id)) or 0


def _zone_type(zone: HostedZone) -> str:
    return "PRIVATE" if zone.is_private else "PUBLIC"


def _to_list_item(zone: HostedZone, record_count: int) -> HostedZoneListItem:
    return HostedZoneListItem(
        id=zone.id,
        name=zone.name,
        type=_zone_type(zone),
        comment=zone.comment,
        record_count=record_count,
        created_at=zone.created_at,
        updated_at=zone.updated_at,
    )


def _to_out(db: Session, zone: HostedZone) -> HostedZoneOut:
    base = _to_list_item(zone, _record_count(db, zone.id))
    vpcs = [VpcOut(region=v.region, vpc_id=v.vpc_id) for v in sorted(zone.vpcs, key=lambda v: v.id)]
    return HostedZoneOut(**base.model_dump(), vpcs=vpcs)


def _vpc_rows(vpcs: list[VpcIn]) -> list[ZoneVpc]:
    # De-duplicate so the (zone, region, vpc) unique constraint can't be tripped by the request.
    unique = {(v.region, v.vpc_id) for v in vpcs}
    return [ZoneVpc(region=region, vpc_id=vpc_id) for region, vpc_id in sorted(unique)]


def create_zone(db: Session, owner_id: int, data: HostedZoneCreate) -> HostedZoneOut:
    name_servers = generate_name_servers()
    zone = HostedZone(
        id=generate_zone_id(),
        user_id=owner_id,
        name=data.name,
        comment=data.comment or "",
        is_private=data.type == "PRIVATE",
    )
    if zone.is_private:
        zone.vpcs = _vpc_rows(data.vpcs)
    zone.records = [
        Record(
            name=zone.name,
            type="SOA",
            ttl=_SOA_TTL,
            values=[f"{name_servers[0]}. admin.{zone.name} 1 7200 900 1209600 86400"],
            is_system=True,
        ),
        Record(
            name=zone.name,
            type="NS",
            ttl=_NS_TTL,
            values=[f"{ns}." for ns in name_servers],
            is_system=True,
        ),
    ]
    db.add(zone)
    db.commit()
    return _to_out(db, zone)


def list_zones(
    db: Session,
    owner_id: int,
    search: str | None = None,
    type_filter: str | None = None,
    page: int = 1,
    page_size: int = 10,
    sort: str = "name",
) -> PaginatedZones:
    if sort not in _SORTS:
        raise AppError("InvalidInput", f"Unsupported sort '{sort}'. Use one of: {', '.join(_SORTS)}.", 400)

    conditions = [HostedZone.user_id == owner_id]
    if search:
        conditions.append(HostedZone.name.icontains(search, autoescape=True))
    if type_filter:
        conditions.append(HostedZone.is_private == (type_filter == "PRIVATE"))

    total = db.scalar(select(func.count(HostedZone.id)).where(*conditions)) or 0
    rows = db.execute(
        select(HostedZone, _record_count_subquery())
        .where(*conditions)
        .order_by(_SORTS[sort], HostedZone.id)
        .limit(page_size)
        .offset((page - 1) * page_size)
    ).all()
    items = [_to_list_item(zone, count) for zone, count in rows]
    return PaginatedZones(items=items, total=total, page=page, page_size=page_size)


def get_zone(db: Session, owner_id: int, zone_id: str) -> HostedZoneOut:
    return _to_out(db, get_owned_zone(db, owner_id, zone_id))


def update_zone(db: Session, owner_id: int, zone_id: str, data: HostedZoneUpdate) -> HostedZoneOut:
    zone = get_owned_zone(db, owner_id, zone_id)
    fields = data.model_fields_set

    if "vpcs" in fields and data.vpcs is not None:
        if not zone.is_private:
            raise AppError("InvalidInput", "VPC associations can only be changed on a private hosted zone.", 400)
        if not data.vpcs:
            raise AppError("InvalidInput", "A private hosted zone must keep at least one VPC.", 400)
        zone.vpcs = _vpc_rows(data.vpcs)
    if "comment" in fields:
        zone.comment = data.comment or ""

    db.commit()
    return _to_out(db, zone)


def delete_zone(db: Session, owner_id: int, zone_id: str) -> None:
    zone = get_owned_zone(db, owner_id, zone_id)
    user_records = db.scalar(
        select(func.count(Record.id)).where(Record.zone_id == zone.id, Record.is_system.is_(False))
    )
    if user_records:
        raise AppError(
            "HostedZoneNotEmpty",
            "The specified hosted zone contains non-required resource record sets and so cannot be deleted.",
            409,
        )
    db.delete(zone)
    db.commit()


def bulk_delete_zones(db: Session, owner_id: int, ids: list[str]) -> BulkDeleteResult:
    result = BulkDeleteResult(deleted=[], failed=[])
    for zone_id in dict.fromkeys(ids):  # preserve order, drop duplicates
        try:
            delete_zone(db, owner_id, zone_id)
            result.deleted.append(zone_id)
        except AppError as exc:
            result.failed.append(BulkDeleteFailure(id=zone_id, error=exc.message))
    return result


def get_tags(db: Session, owner_id: int, zone_id: str) -> dict[str, str]:
    zone = get_owned_zone(db, owner_id, zone_id)
    return {tag.key: tag.value for tag in zone.tags}


def set_tags(db: Session, owner_id: int, zone_id: str, tags: dict[str, str]) -> dict[str, str]:
    zone = get_owned_zone(db, owner_id, zone_id)
    zone.tags.clear()
    db.flush()  # delete old rows before inserting, so reused keys don't hit the unique constraint
    zone.tags.extend(ZoneTag(key=k, value=v) for k, v in tags.items())
    db.commit()
    return {tag.key: tag.value for tag in zone.tags}
