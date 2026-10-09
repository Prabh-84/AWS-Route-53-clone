from typing import Literal

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
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
from app.services import zone_service

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
