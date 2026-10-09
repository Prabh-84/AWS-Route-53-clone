import re
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

RecordType = Literal["A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA"]
RoutingPolicy = Literal["SIMPLE", "WEIGHTED", "LATENCY", "FAILOVER", "GEOLOCATION", "MULTIVALUE"]

_GEO = re.compile(r"^(\*|AF|AN|AS|EU|OC|NA|SA|[A-Z]{2}|[A-Z]{2}-[A-Z0-9]{1,3})$")

# The routing-specific fields each policy needs; every other policy field must be left empty.
_POLICY_FIELD = {
    "WEIGHTED": "weight",
    "LATENCY": "region",
    "FAILOVER": "failover",
    "GEOLOCATION": "geo_location",
}
_POLICY_FIELDS = tuple(_POLICY_FIELD.values())


class AliasTarget(BaseModel):
    dns_name: str = Field(min_length=1, max_length=255)
    hosted_zone_id: str = Field(min_length=1, max_length=32)
    evaluate_target_health: bool = False


class RecordFields(BaseModel):
    """Fields shared by create and update; carries the cross-field rules."""

    ttl: int | None = Field(default=None, ge=0, le=2147483647)
    values: list[str] = []
    routing_policy: RoutingPolicy = "SIMPLE"
    set_identifier: str | None = Field(default=None, max_length=128)
    weight: int | None = Field(default=None, ge=0, le=255)
    region: str | None = Field(default=None, max_length=32)
    failover: Literal["PRIMARY", "SECONDARY"] | None = None
    geo_location: str | None = None
    alias_target: AliasTarget | None = None
    health_check_id: str | None = Field(default=None, max_length=64)

    @field_validator("geo_location")
    @classmethod
    def _check_geo(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip().upper()
        if not _GEO.match(v):
            raise ValueError("Geolocation must be '*', a continent code, a country code or a country-subdivision code.")
        return v

    @model_validator(mode="after")
    def _check_rules(self) -> "RecordFields":
        if self.alias_target is not None:
            if self.ttl is not None:
                raise ValueError("TTL must not be set on an alias record.")
            if self.values:
                raise ValueError("An alias record cannot also have values.")
        else:
            if not self.values:
                raise ValueError("At least one value is required.")
            if self.ttl is None:
                raise ValueError("TTL is required.")

        if self.routing_policy == "SIMPLE":
            if self.set_identifier:
                raise ValueError("A simple routing record cannot have a record ID (set identifier).")
        elif not self.set_identifier:
            raise ValueError(f"A record ID (set identifier) is required for {self.routing_policy} routing.")

        needed = _POLICY_FIELD.get(self.routing_policy)
        for field in _POLICY_FIELDS:
            present = getattr(self, field) is not None
            if field == needed and not present:
                raise ValueError(f"'{field}' is required for {self.routing_policy} routing.")
            if field != needed and present:
                raise ValueError(f"'{field}' is not valid for {self.routing_policy} routing.")
        return self


class RecordCreate(RecordFields):
    name: str = Field(max_length=255)  # relative label, "@" / "" for the apex, or a full name in the zone
    type: RecordType


class RecordUpdate(RecordFields):
    """name and type are immutable, so they are not accepted here."""


class RecordCreateBatch(BaseModel):
    records: list[RecordCreate] = Field(min_length=1, max_length=100)


class RecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    zone_id: str
    name: str
    type: str  # includes SOA, which only exists as a system record
    ttl: int | None
    values: list[str]
    routing_policy: str
    set_identifier: str | None
    weight: int | None
    region: str | None
    failover: str | None
    geo_location: str | None
    alias_target: AliasTarget | None
    health_check_id: str | None
    is_system: bool
    created_at: datetime
    updated_at: datetime

    @field_validator("geo_location", mode="before")
    @classmethod
    def _geo_from_db(cls, v: Any) -> Any:
        return v.get("location") if isinstance(v, dict) else v

    @field_validator("set_identifier", mode="before")
    @classmethod
    def _empty_set_identifier(cls, v: Any) -> Any:
        return v or None


class RecordBatchOut(BaseModel):
    records: list[RecordOut]


class PaginatedRecords(BaseModel):
    items: list[RecordOut]
    total: int
    page: int
    page_size: int


class RecordBulkDeleteRequest(BaseModel):
    ids: list[int] = Field(min_length=1, max_length=100)


class RecordBulkDeleteFailure(BaseModel):
    id: int
    error: str


class RecordBulkDeleteResult(BaseModel):
    deleted: list[int]
    failed: list[RecordBulkDeleteFailure]
