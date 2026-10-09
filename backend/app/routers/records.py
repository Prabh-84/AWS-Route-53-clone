from typing import Annotated, Any, Literal

from fastapi import APIRouter, Body, Depends, Query, Response
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import HostedZone, User
from app.schemas.record import (
    PaginatedRecords,
    RecordBatchOut,
    RecordBulkDeleteRequest,
    RecordBulkDeleteResult,
    RecordCreate,
    RecordCreateBatch,
    RecordOut,
    RecordType,
    RecordUpdate,
    RoutingPolicy,
)
from app.services import record_service, zone_service


def get_zone(zone_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> HostedZone:
    return zone_service.get_owned_zone(db, user.id, zone_id)


router = APIRouter(prefix="/hostedzones/{zone_id}/records", tags=["records"])
ZoneDep = Annotated[HostedZone, Depends(get_zone)]
DbDep = Annotated[Session, Depends(get_db)]


@router.get("", response_model=PaginatedRecords)
def list_records(
    zone: ZoneDep,
    db: DbDep,
    search: str | None = None,
    type: RecordType | Literal["SOA"] | None = None,
    routing_policy: RoutingPolicy | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
):
    return record_service.list_records(db, zone, search, type, routing_policy, page, page_size)


@router.post("", response_model=RecordOut | RecordBatchOut, status_code=201)
def create_records(zone: ZoneDep, db: DbDep, body: Annotated[dict[str, Any], Body()]):
    """Accepts one record, or {"records": [...]} to create several atomically."""
    try:
        batch = RecordCreateBatch.model_validate(body) if "records" in body else None
        single = None if batch else RecordCreate.model_validate(body)
    except ValidationError as exc:
        raise RequestValidationError(exc.errors(include_context=False, include_url=False)) from exc
    if batch:
        return RecordBatchOut(records=record_service.create_records_batch(db, zone, batch.records))
    return record_service.create_record(db, zone, single)


@router.post("/bulk-delete", response_model=RecordBulkDeleteResult)
def bulk_delete_records(zone: ZoneDep, db: DbDep, body: RecordBulkDeleteRequest):
    return record_service.bulk_delete_records(db, zone, body.ids)


@router.get("/{record_id}", response_model=RecordOut)
def get_record(record_id: int, zone: ZoneDep, db: DbDep):
    return record_service.get_record(db, zone, record_id)


@router.put("/{record_id}", response_model=RecordOut)
def update_record(record_id: int, body: RecordUpdate, zone: ZoneDep, db: DbDep):
    return record_service.update_record(db, zone, record_id, body)


@router.delete("/{record_id}", status_code=204)
def delete_record(record_id: int, zone: ZoneDep, db: DbDep) -> Response:
    record_service.delete_record(db, zone, record_id)
    return Response(status_code=204)
