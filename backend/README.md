# Route 53 Clone — Backend

FastAPI + SQLAlchemy 2.0 + Alembic + SQLite. All routes live under `/api/v1`.

## Run

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows  (source .venv/bin/activate on macOS/Linux)
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

- API docs: http://localhost:8000/docs
- Health check: http://localhost:8000/api/v1/health

## Test

```bash
pytest
```

## Configuration

Environment variables (or a `.env` file): `DATABASE_URL` (default `sqlite:///./data/route53.db`),
`SESSION_TTL_HOURS` (default `8`), `CORS_ORIGINS` (default `["http://localhost:3000"]`).

## Migrations

```bash
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```
