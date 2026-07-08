"""Environment config, validated at boundary (§4.2). Import `settings`, never os.environ."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    amadeus_client_id: str = ""
    amadeus_client_secret: str = ""
    amadeus_env: str = "test"
    resend_api_key: str = ""


settings = Settings()  # raises on missing DATABASE_URL — fail fast, don't limp
