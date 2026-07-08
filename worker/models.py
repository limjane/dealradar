"""Pydantic models mirroring apps/web/lib/db/schema.ts (the drizzle schema is canonical).

Schema changes: edit schema.ts first, generate the migration, then update these
shapes in the same commit. Do not let them drift.
"""

from datetime import datetime
from decimal import Decimal
from enum import StrEnum

from pydantic import BaseModel


class DealStatus(StrEnum):
    ACTIVE = "active"
    EXPIRED = "expired"


class Route(BaseModel):
    id: int
    origin: str  # IATA
    destination: str  # IATA
    active: bool
    seed_priority: int


class PriceSnapshot(BaseModel):
    route_id: int
    travel_month: str  # YYYY-MM
    cabin: str
    price: Decimal
    currency: str
    source: str
    fetched_at: datetime | None = None  # DB default


class Deal(BaseModel):
    route_id: int
    price: Decimal
    baseline_median: Decimal
    discount_pct: Decimal
    score: Decimal
    deep_link_params: dict
    status: DealStatus = DealStatus.ACTIVE
    expires_at: datetime | None = None
