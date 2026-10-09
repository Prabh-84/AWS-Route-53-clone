import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

ZoneType = Literal["PUBLIC", "PRIVATE"]

_LABEL = re.compile(r"^(?!-)[a-z0-9_-]{1,63}(?<!-)$")
_REGION = re.compile(r"^[a-z]{2}(-[a-z]+)+-\d$")
_VPC_ID = re.compile(r"^vpc-[0-9a-f]{8,17}$")


def normalize_domain_name(value: str) -> str:
    """Lowercase and ensure the trailing dot; reject names that are not valid DNS names."""
    name = value.strip().lower()
    if not name.endswith("."):
        name += "."
    labels = name[:-1].split(".")
    if len(name) > 254 or not all(_LABEL.match(label) for label in labels):
        raise ValueError(f"'{value}' is not a valid domain name.")
    return name


class VpcIn(BaseModel):
    region: str
    vpc_id: str

    @field_validator("region")
    @classmethod
    def _check_region(cls, v: str) -> str:
        if not _REGION.match(v):
            raise ValueError(f"'{v}' is not a valid AWS Region.")
        return v

    @field_validator("vpc_id")
    @classmethod
    def _check_vpc_id(cls, v: str) -> str:
        if not _VPC_ID.match(v):
            raise ValueError(f"'{v}' is not a valid VPC ID.")
        return v


class VpcOut(BaseModel):
    region: str
    vpc_id: str


class HostedZoneCreate(BaseModel):
    name: str
    comment: str | None = Field(default=None, max_length=256)
    type: ZoneType = "PUBLIC"
    vpcs: list[VpcIn] = []

    @field_validator("name")
    @classmethod
    def _normalize_name(cls, v: str) -> str:
        return normalize_domain_name(v)

    @model_validator(mode="after")
    def _check_vpcs(self) -> "HostedZoneCreate":
        if self.type == "PRIVATE" and not self.vpcs:
            raise ValueError("A private hosted zone must be associated with at least one VPC.")
        if self.type == "PUBLIC" and self.vpcs:
            raise ValueError("A public hosted zone cannot be associated with a VPC.")
        return self


class HostedZoneUpdate(BaseModel):
    comment: str | None = Field(default=None, max_length=256)
    vpcs: list[VpcIn] | None = None  # only allowed for PRIVATE zones


class HostedZoneListItem(BaseModel):
    id: str
    name: str
    type: ZoneType
    comment: str
    record_count: int
    created_at: datetime
    updated_at: datetime


class HostedZoneOut(HostedZoneListItem):
    vpcs: list[VpcOut]


class PaginatedZones(BaseModel):
    items: list[HostedZoneListItem]
    total: int
    page: int
    page_size: int


class BulkDeleteRequest(BaseModel):
    ids: list[str] = Field(min_length=1, max_length=100)


class BulkDeleteFailure(BaseModel):
    id: str
    error: str


class BulkDeleteResult(BaseModel):
    deleted: list[str]
    failed: list[BulkDeleteFailure]


class TagsIn(BaseModel):
    tags: dict[str, str] = Field(max_length=50)

    @field_validator("tags")
    @classmethod
    def _check_tags(cls, tags: dict[str, str]) -> dict[str, str]:
        for key, value in tags.items():
            if not key or len(key) > 128:
                raise ValueError("Tag keys must be between 1 and 128 characters.")
            if len(value) > 256:
                raise ValueError("Tag values must be at most 256 characters.")
        return tags


class TagsOut(BaseModel):
    tags: dict[str, str]
