"""Typed settings. Every value comes from an env var (or the repo's `.env`), with a working default for local dev.

New settings are documented in `.env.example`.
"""

import tomllib
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parent.parent
REPO_ROOT = BACKEND_ROOT.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=REPO_ROOT / ".env", extra="ignore")

    redis_url: str = "redis://localhost:6379/0"
    log_level: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    return Settings()


@lru_cache
def app_version() -> str:
    """The API version, read from `backend/pyproject.toml` so there is one place to bump it."""
    with (BACKEND_ROOT / "pyproject.toml").open("rb") as f:
        return tomllib.load(f)["project"]["version"]
