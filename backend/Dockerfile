FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DATABASE_URL=sqlite:////data/route53.db

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --default-timeout=100 --retries 5 -r requirements.txt

COPY alembic.ini .
COPY alembic ./alembic
COPY app ./app
COPY entrypoint.sh .
# Normalise line endings in case the file was checked out with CRLF on Windows.
RUN sed -i 's/\r$//' entrypoint.sh && chmod +x entrypoint.sh && mkdir -p /data

# The SQLite file lives here; mount a volume to keep data across container restarts.
VOLUME /data
EXPOSE 8000

ENTRYPOINT ["./entrypoint.sh"]
