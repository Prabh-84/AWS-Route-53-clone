import re

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models import HostedZone, Record
from app.models._common import utcnow
from app.schemas.record import (
    PaginatedRecords,
    RecordBulkDeleteFailure,
    RecordBulkDeleteResult,
    RecordCreate,
    RecordFields,
    RecordOut,
    RecordUpdate,
)
from app.services.record_validators import validate_values

_LABEL = re.compile(r"^(\*|[a-z0-9_]([a-z0-9_-]{0,61}[a-z0-9_])?)$")


def _invalid(message: str) -> AppError:
    return AppError("InvalidInput", message, 400)


def _conflict(message: str) -> AppError:
    return AppError("InvalidChangeBatch", message, 409)


def resolve_name(zone: HostedZone, raw: str) -> str:
    """Turn what the user typed into a full lowercase name with a trailing dot, inside `zone`."""
    typed = raw.strip().lower()
    apex = zone.name.rstrip(".")
    if typed in ("", "@"):
        return zone.name
    if typed.endswith("."):
        full = typed
    elif typed == apex or typed.endswith("." + apex):
        full = typed + "."
    else:
        full = f"{typed}.{zone.name}"

    in_zone = full == zone.name or full.endswith("." + zone.name)
    labels = full[:-1].split(".")
    if not in_zone or len(full) > 254 or not all(_LABEL.match(label) for label in labels):
        raise _invalid(f"RRSet with DNS name {raw} is not permitted in zone {zone.name}")
    return full


def _get_record(db: Session, zone: HostedZone, record_id: int) -> Record:
    record = db.scalar(select(Record).where(Record.id == record_id, Record.zone_id == zone.id))
    if record is None:
        raise AppError("NoSuchRecord", f"No record found with ID: {record_id}", 404)
    return record


def _others_at_name(db: Session, zone_id: str, name: str, exclude_id: int | None):
    query = select(Record).where(Record.zone_id == zone_id, Record.name == name)
    if exclude_id is not None:
        query = query.where(Record.id != exclude_id)
    return query


def _check_conflicts(
    db: Session, zone_id: str, name: str, record_type: str, set_identifier: str, exclude_id: int | None = None
) -> None:
    for other in db.scalars(_others_at_name(db, zone_id, name, exclude_id)):
        if other.type == record_type and other.set_identifier == set_identifier:
            raise _conflict(
                f"Tried to create resource record set [name='{name}', type='{record_type}'] "
                "but it already exists"
            )
        if (record_type == "CNAME") != (other.type == "CNAME"):
            raise _conflict(
                f"RRSet of type CNAME with DNS name {name} is not permitted as it conflicts with other records "
                "with the same DNS name in zone"
            )


def _fill(record: Record, data: RecordFields, values: list[str]) -> None:
    record.ttl = data.ttl
    record.values = values
    record.routing_policy = data.routing_policy
    record.set_identifier = data.set_identifier or ""
    record.weight = data.weight
    record.region = data.region
    record.failover = data.failover
    record.geo_location = {"location": data.geo_location} if data.geo_location else None
    record.alias_target = data.alias_target.model_dump() if data.alias_target else None
    record.health_check_id = data.health_check_id


def _values_for(record_type: str, name: str, data: RecordFields) -> list[str]:
    return [] if data.alias_target else validate_values(record_type, name, data.values)


def _add(db: Session, zone: HostedZone, data: RecordCreate) -> Record:
    name = resolve_name(zone, data.name)
    values = _values_for(data.type, name, data)
    _check_conflicts(db, zone.id, name, data.type, data.set_identifier or "")
    record = Record(zone_id=zone.id, name=name, type=data.type, is_system=False)
    _fill(record, data, values)
    db.add(record)
    db.flush()
    zone.updated_at = utcnow()
    return record


def create_record(db: Session, zone: HostedZone, data: RecordCreate) -> RecordOut:
    try:
        record = _add(db, zone, data)
        db.commit()
    except AppError:
        db.rollback()
        raise
    return RecordOut.model_validate(record)


def create_records_batch(db: Session, zone: HostedZone, items: list[RecordCreate]) -> list[RecordOut]:
    """All-or-nothing: if any record is rejected nothing is saved."""
    created: list[Record] = []
    for index, item in enumerate(items, start=1):
        try:
            created.append(_add(db, zone, item))
        except AppError as exc:
            db.rollback()
            raise AppError(
                exc.code, f"Record {index} of {len(items)} ({item.name} {item.type}): {exc.message}", exc.status_code
            ) from exc
    db.commit()
    return [RecordOut.model_validate(r) for r in created]


def list_records(
    db: Session,
    zone: HostedZone,
    search: str | None = None,
    type_filter: str | None = None,
    routing_policy_filter: str | None = None,
    page: int = 1,
    page_size: int = 10,
) -> PaginatedRecords:
    conditions = [Record.zone_id == zone.id]
    if search:
        conditions.append(Record.name.icontains(search, autoescape=True))
    if type_filter:
        conditions.append(Record.type == type_filter)
    if routing_policy_filter:
        conditions.append(Record.routing_policy == routing_policy_filter)

    total = db.scalar(select(func.count(Record.id)).where(*conditions)) or 0
    rows = db.scalars(
        select(Record)
        .where(*conditions)
        .order_by(Record.name, Record.type, Record.set_identifier)
        .limit(page_size)
        .offset((page - 1) * page_size)
    ).all()
    return PaginatedRecords(
        items=[RecordOut.model_validate(r) for r in rows], total=total, page=page, page_size=page_size
    )


def get_record(db: Session, zone: HostedZone, record_id: int) -> RecordOut:
    return RecordOut.model_validate(_get_record(db, zone, record_id))


def update_record(db: Session, zone: HostedZone, record_id: int, data: RecordUpdate) -> RecordOut:
    record = _get_record(db, zone, record_id)
    if record.is_system:
        raise AppError("CannotEditSystemRecord", "The default SOA and NS records cannot be edited.", 400)
    values = _values_for(record.type, record.name, data)
    _check_conflicts(db, zone.id, record.name, record.type, data.set_identifier or "", exclude_id=record.id)
    _fill(record, data, values)
    zone.updated_at = utcnow()
    db.commit()
    return RecordOut.model_validate(record)


def _delete(db: Session, zone: HostedZone, record_id: int) -> None:
    record = _get_record(db, zone, record_id)
    if record.is_system:
        raise AppError("CannotDeleteSystemRecord", "The default SOA and NS records cannot be deleted.", 400)
    db.delete(record)
    zone.updated_at = utcnow()


def delete_record(db: Session, zone: HostedZone, record_id: int) -> None:
    _delete(db, zone, record_id)
    db.commit()


def bulk_delete_records(db: Session, zone: HostedZone, ids: list[int]) -> RecordBulkDeleteResult:
    result = RecordBulkDeleteResult(deleted=[], failed=[])
    for record_id in dict.fromkeys(ids):
        try:
            _delete(db, zone, record_id)
            db.commit()
            result.deleted.append(record_id)
        except AppError as exc:
            db.rollback()
            result.failed.append(RecordBulkDeleteFailure(id=record_id, error=exc.message))
    return result
