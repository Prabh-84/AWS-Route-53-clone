from typing import Literal

from pydantic import BaseModel


class ImportRecord(BaseModel):
    name: str
    type: str
    ttl: int | None
    values: list[str]


class ImportSkip(BaseModel):
    line: int | None
    record: str
    reason: str


class ImportPreview(BaseModel):
    """Result of a dry run: nothing was saved."""

    dry_run: Literal[True] = True
    would_create: list[ImportRecord]
    would_skip: list[ImportSkip]


class ImportSummary(BaseModel):
    """Result of a real import."""

    dry_run: Literal[False] = False
    created: list[ImportRecord]
    skipped: list[ImportSkip]
