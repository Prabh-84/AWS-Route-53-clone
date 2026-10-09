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

Environment variables (or a `.env` file; copy `.env.example`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `sqlite:///./data/route53.db` | Database location |
| `SESSION_TTL_HOURS` | `8` | Login session lifetime |
| `COOKIE_SECURE` | `true` | Sets the `Secure` flag on the session cookie. Keep `true` in production (HTTPS); set `false` for local HTTP development |
| `CORS_ORIGINS` | `["http://localhost:3000"]` | Allowed browser origins (only relevant if the API is called cross-origin) |

## Migrations

```bash
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```
