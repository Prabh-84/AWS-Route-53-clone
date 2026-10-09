"""Per-type validation of record values. Each validator returns the normalized values."""

import ipaddress
import re
from collections.abc import Callable

import dns.exception
import dns.name

from app.core.errors import AppError

_LABEL = re.compile(r"^(\*|[A-Za-z0-9_]([A-Za-z0-9_-]{0,61}[A-Za-z0-9_])?)$")
_MX = re.compile(r"^(\d{1,5})\s+(\S+)$")
_SRV = re.compile(r"^(\d{1,5})\s+(\d{1,5})\s+(\d{1,5})\s+(\S+)$")
_CAA = re.compile(r'^(\d{1,3})\s+(issue|issuewild|iodef)\s+"(.+)"$')


def _invalid(message: str) -> AppError:
    return AppError("InvalidInput", message, 400)


def _is_hostname(value: str, allow_root: bool = False) -> bool:
    if not value or any(ch.isspace() for ch in value):
        return False
    try:
        name = dns.name.from_text(value, origin=dns.name.root)
    except dns.exception.DNSException:
        return False
    if name == dns.name.root:
        return allow_root
    if len(name.to_text()) > 254:
        return False
    return all(_LABEL.match(label.decode("ascii", "replace")) for label in name.labels[:-1])


def _in_range(text: str, high: int) -> bool:
    return 0 <= int(text) <= high


def validate_A(name: str, values: list[str]) -> list[str]:
    for v in values:
        try:
            ipaddress.IPv4Address(v)
        except ValueError:
            raise _invalid(f"Record value for type A is not a valid IPv4 address: '{v}'") from None
    return values


def validate_AAAA(name: str, values: list[str]) -> list[str]:
    for v in values:
        try:
            if "%" in v:
                raise ValueError(v)
            ipaddress.IPv6Address(v)
        except ValueError:
            raise _invalid(f"Record value for type AAAA is not a valid IPv6 address: '{v}'") from None
    return values


def validate_CNAME(name: str, values: list[str]) -> list[str]:
    if len(values) != 1:
        raise _invalid("A CNAME record must have exactly one value.")
    if not _is_hostname(values[0]):
        raise _invalid(f"Record value for type CNAME is not a valid domain name: '{values[0]}'")
    return values


def validate_TXT(name: str, values: list[str]) -> list[str]:
    normalized = []
    for v in values:
        quoted = len(v) >= 2 and v.startswith('"') and v.endswith('"')
        content = v[1:-1] if quoted else v
        if len(content) > 255:
            raise _invalid("Record value for type TXT must not exceed 255 characters per string.")
        normalized.append(v if quoted else '"' + content.replace('"', '\\"') + '"')
    return normalized


def validate_MX(name: str, values: list[str]) -> list[str]:
    for v in values:
        match = _MX.match(v)
        if not match or not _in_range(match[1], 65535) or not _is_hostname(match[2], allow_root=True):
            raise _invalid(
                f"Record value for type MX must be '<priority 0-65535> <mail server domain name>': '{v}'"
            )
    return values


def validate_NS(name: str, values: list[str]) -> list[str]:
    for v in values:
        if not v.endswith(".") or not _is_hostname(v):
            raise _invalid(
                f"Record value for type NS must be a domain name ending with a dot: '{v}'"
            )
    return values


def validate_PTR(name: str, values: list[str]) -> list[str]:
    for v in values:
        if not _is_hostname(v):
            raise _invalid(f"Record value for type PTR is not a valid domain name: '{v}'")
    return values


def validate_SRV(name: str, values: list[str]) -> list[str]:
    for v in values:
        match = _SRV.match(v)
        if (
            not match
            or not all(_in_range(match[i], 65535) for i in (1, 2, 3))
            or not _is_hostname(match[4], allow_root=True)
        ):
            raise _invalid(
                f"Record value for type SRV must be '<priority> <weight> <port> <target domain name>', "
                f"each number between 0 and 65535: '{v}'"
            )
    return values


def validate_CAA(name: str, values: list[str]) -> list[str]:
    for v in values:
        match = _CAA.match(v)
        if not match or not _in_range(match[1], 255):
            raise _invalid(
                f"Record value for type CAA must be '<flags 0-255> <issue|issuewild|iodef> \"<value>\"': '{v}'"
            )
    return values


VALIDATORS: dict[str, Callable[[str, list[str]], list[str]]] = {
    "A": validate_A,
    "AAAA": validate_AAAA,
    "CNAME": validate_CNAME,
    "TXT": validate_TXT,
    "MX": validate_MX,
    "NS": validate_NS,
    "PTR": validate_PTR,
    "SRV": validate_SRV,
    "CAA": validate_CAA,
}


def validate_values(record_type: str, name: str, values: list[str]) -> list[str]:
    """Validate and normalize `values` for `record_type`; raises AppError(InvalidInput, 400)."""
    cleaned = [v.strip() for v in values]
    if any(not v for v in cleaned):
        raise _invalid("Record values must not be empty.")
    normalized = VALIDATORS[record_type](name, cleaned)
    if len(set(normalized)) != len(normalized):
        raise _invalid("Duplicate Resource Record values are not allowed.")
    return normalized
