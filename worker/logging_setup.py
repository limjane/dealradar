"""Structured JSON logging from day one (foundation §5) — this IS the ops dashboard at MVP."""

import json
import logging
import sys
from datetime import UTC, datetime


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, object] = {
            "ts": datetime.now(UTC).isoformat(),
            "level": record.levelname,
            "job": record.name,
            "msg": record.getMessage(),
        }
        extra = getattr(record, "summary", None)  # per-run summary line (§5)
        if extra:
            payload["summary"] = extra
        return json.dumps(payload)


def get_logger(job: str) -> logging.Logger:
    logger = logging.getLogger(job)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JsonFormatter())
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger
