import json
from typing import Literal

from fastapi import APIRouter, Depends, Query, Request, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import AppError
from app.core.security import get_current_user
from app.models import User
from app.schemas.hosted_zone import (
    BulkDeleteRequest,
    BulkDeleteResult,
    HostedZoneCreate,
    HostedZoneOut,
    HostedZoneUpdate,
    PaginatedZones,
    TagsIn,
    TagsOut,
)
from app.schemas.zone_io import ImportPreview, ImportSummary
from app.services import bind_io, record_service, zone_service

router = APIRouter(prefix="/hostedzones", tags=["hosted zones"])


@router.get("", response_model=PaginatedZones)
def list_zones(
    search: str | None = None,
    type: Literal["PUBLIC", "PRIVATE"] | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    sort: str = "name",
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return zone_service.list_zones(db, user.id, search, type, page, page_size, sort)


@router.post("", response_model=HostedZoneOut, status_code=201)
def create_zone(body: HostedZoneCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return zone_service.create_zone(db, user.id, body)


@router.post("/bulk-delete", response_model=BulkDeleteResult)
def bulk_delete_zones(
    body: BulkDeleteRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return zone_service.bulk_delete_zones(db, user.id, body.ids)


@router.get("/{zone_id}", response_model=HostedZoneOut)
def get_zone(zone_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return zone_service.get_zone(db, user.id, zone_id)


@router.patch("/{zone_id}", response_model=HostedZoneOut)
def update_zone(
    zone_id: str, body: HostedZoneUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return zone_service.update_zone(db, user.id, zone_id, body)


@router.delete("/{zone_id}", status_code=204)
def delete_zone(zone_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Response:
    zone_service.delete_zone(db, user.id, zone_id)
    return Response(status_code=204)


@router.get("/{zone_id}/tags", response_model=TagsOut)
def get_tags(zone_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return TagsOut(tags=zone_service.get_tags(db, user.id, zone_id))


@router.put("/{zone_id}/tags", response_model=TagsOut)
def set_tags(zone_id: str, body: TagsIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return TagsOut(tags=zone_service.set_tags(db, user.id, zone_id, body.tags))


@router.post("/{zone_id}/import", response_model=ImportPreview | ImportSummary)
async def import_zone_file(
    zone_id: str,
    request: Request,
    dry_run: bool = True,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Body is raw zone file text (BIND format, or a JSON export). dry_run=true previews without saving."""
    zone = zone_service.get_owned_zone(db, user.id, zone_id)
    raw = await request.body()
    if len(raw) > bind_io.MAX_IMPORT_BYTES:
        raise AppError("InvalidInput", "The zone file is too large (limit 1 MB).", 400)
    return record_service.import_records(db, zone, raw.decode("utf-8", errors="replace"), dry_run)


@router.get("/{zone_id}/export")
def export_zone(
    zone_id: str,
    format: Literal["json", "bind"] = "json",
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    zone = zone_service.get_owned_zone(db, user.id, zone_id)
    records = record_service.all_records(db, zone)
    base_name = zone.name.rstrip(".")
    if format == "bind":
        content, media_type, filename = bind_io.export_bind_zone(zone, records), "text/dns; charset=utf-8", f"{base_name}.zone"
    else:
        content = json.dumps(bind_io.export_json_zone(zone, records), indent=2) + "\n"
        media_type, filename = "application/json", f"{base_name}.json"
    return Response(content=content, media_type=media_type, headers={"Content-Disposition": f'attachment; filename="{filename}"'})
