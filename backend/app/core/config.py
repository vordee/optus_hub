from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Optus Hub API"
    app_env: str = "development"
    api_port: int = 8000
    database_url: str = "sqlite+pysqlite:///:memory:"
    redis_url: str = "redis://localhost:6379/0"
    secret_key: str = "change-me"
    access_token_expire_minutes: int = 60
    bootstrap_admin_email: str = "admin@example.com"
    bootstrap_admin_password: str = "change-me-now"
    jwt_algorithm: str = "HS256"
    bling_enabled: bool = False
    bling_api_base_url: str = "https://api.bling.com.br/Api/v3"
    bling_oauth_base_url: str = "https://www.bling.com.br/Api/v3"
    bling_client_id: str = ""
    bling_client_secret: str = ""
    bling_redirect_uri: str = ""
    bling_access_token: str = ""
    bling_refresh_token: str = ""
    bling_sync_interval_minutes: int = 60

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
