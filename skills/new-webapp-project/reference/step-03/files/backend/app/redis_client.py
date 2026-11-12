"""The one Redis client the API shares. Tests replace `get_redis` with fakeredis."""

from functools import lru_cache

from redis import Redis

from app.config import get_settings


@lru_cache
def get_redis() -> Redis:
    # Short timeouts so readyz answers quickly when Redis is down instead of hanging the probe.
    return Redis.from_url(get_settings().redis_url, socket_connect_timeout=1, socket_timeout=1)
