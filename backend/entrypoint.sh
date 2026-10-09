#!/bin/sh
set -e

# Create/upgrade the schema, add the demo user and sample zones (both are idempotent), then serve.
alembic upgrade head
python -m app.seed
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
