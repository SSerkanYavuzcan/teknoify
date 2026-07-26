FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt ./
RUN python -m pip install --upgrade "pip<27" \
    && python -m pip install --requirement requirements.txt

RUN addgroup --system app && adduser --system --ingroup app app
COPY --chown=app:app app ./app

USER app
EXPOSE 8081

CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8081} --proxy-headers --forwarded-allow-ips='*'"]
