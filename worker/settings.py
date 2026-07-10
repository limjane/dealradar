"""Environment config, validated at boundary (§4.2). Import `settings`, never os.environ."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    # Travelpayouts Data API (D10 — replaced Amadeus, retired 2026-07-17).
    travelpayouts_token: str = ""  # required to poll; empty is fine for DB-only jobs
    travelpayouts_marker: str = ""  # affiliate partner id — used from task 5
    resend_api_key: str = ""


settings = Settings()  # raises on missing DATABASE_URL — fail fast, don't limp
