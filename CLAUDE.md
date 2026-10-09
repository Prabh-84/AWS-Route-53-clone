# CLAUDE.md

## Project
AWS Route 53 console clone. Graded mainly on how closely the UI/UX matches the real Route 53 console, then on code quality, API design, DB design and docs. Reference screenshots are in docs/reference/ — always look at them before building any UI.

## Stack (fixed, do not change)
- frontend/: Next.js (App Router) + TypeScript + Cloudscape Design System (@cloudscape-design/components, @cloudscape-design/global-styles, @cloudscape-design/collection-hooks) + TanStack Query + React Hook Form + Zod
- backend/: FastAPI + SQLAlchemy 2.0 + Alembic + Pydantic v2 + SQLite + dnspython + passlib[bcrypt]
- Frontend calls backend only through a same-origin proxy: /api/* -> BACKEND_URL/api/* (implemented in frontend/src/proxy.ts so BACKEND_URL is read at runtime), so cookies stay same-origin.

## UI rules
- Use Cloudscape components for everything they cover (TopNavigation, AppLayout, SideNavigation, BreadcrumbGroup, Flashbar, Table, PropertyFilter, TextFilter, Pagination, CollectionPreferences, Modal, Form, FormField, Tiles, Container, Header, Tabs, Alert). Never hand-roll something Cloudscape provides.
- Match the classic AWS console look shown in docs/reference (grey page, square bordered buttons, orange active nav item, blue "Info" links). Copy AWS wording exactly.
- Every mutation shows a Flashbar notification (success or error). Every delete has a confirmation Modal.

## Backend rules
- Layers: routers/ (parse + return only) -> services/ (all business rules) -> models/ (SQLAlchemy). Pydantic schemas in schemas/.
- All routes under /api/v1. Error shape everywhere: {"error": {"code": "<Route53StyleCode>", "message": "..."}}.
- Auth is mocked: users + sessions tables, httpOnly SameSite=Lax cookie "session", get_current_user dependency on every route except login/health.
- Data is scoped to the logged-in user.

## Domain rules (Route 53 behaviour)
- Hosted zone IDs: "Z" + 20 uppercase alphanumerics. Names stored lowercase with trailing dot.
- Creating a zone auto-creates one SOA and one NS record (4 fake name servers like ns-123.awsdns-45.com/.net/.org/.co.uk), flagged is_system and undeletable.
- Zone delete fails with HostedZoneNotEmpty (409) if non-system records exist.
- Record types: A, AAAA, CNAME, TXT, MX, NS, PTR, SRV, CAA (+ system SOA). Per-type value validation; CNAME cannot coexist with other records at the same name; unique (zone_id, name, type, set_identifier).
- Private zones need at least one VPC (region + vpc_id); stored in zone_vpcs.

## Database tables
users, sessions, hosted_zones, zone_vpcs, zone_tags, records, change_log (optional).
records: id, zone_id FK cascade, name, type, ttl, values (JSON list), routing_policy (default SIMPLE), set_identifier, weight, region, failover, geo_location, alias_target (JSON), health_check_id, is_system, created_at, updated_at.

## Workflow
- Before finishing any task: backend -> run pytest; frontend -> run npm run build and npm run lint. Fix failures.
- Keep commits small; one feature per step.
- Never add features not asked for in the current step.
