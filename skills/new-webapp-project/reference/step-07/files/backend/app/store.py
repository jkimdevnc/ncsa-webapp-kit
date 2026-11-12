"""Where analysis results are kept. Swap point: persistence or retention rules change only this module and config.

Today results live in Redis with a TTL (docs/decisions/0001), and a record never holds the entered values
(docs/decisions/0003): only the outputs and the codes of the variables used.
"""

from datetime import datetime
from typing import Annotated, Any, Literal, Protocol

from fastapi import Depends
from pydantic import BaseModel
from redis import Redis

from app.config import get_settings
from app.redis_client import get_redis

SCHEMA_VERSION = 1


class AnalysisRecord(BaseModel):
    schema_version: Literal[1] = SCHEMA_VERSION
    id: str
    workup_id: str
    owner: str
    created_at: datetime
    model_id: str
    model_version: str
    dictionary_version: str
    variables_used: list[str]
    outputs: dict[str, Any]


class ResultStore(Protocol):
    def save(self, record: AnalysisRecord) -> None: ...

    def list_for_workup(self, workup_id: str) -> list[AnalysisRecord]: ...


def _analysis_key(analysis_id: str) -> str:
    return f"mosaic:analysis:{analysis_id}"


def _run_log_key(workup_id: str) -> str:
    return f"mosaic:workup:{workup_id}:analyses"


class RedisResultStore:
    def __init__(self, redis: Redis, ttl_seconds: int):
        self.redis = redis
        self.ttl_seconds = ttl_seconds

    def save(self, record: AnalysisRecord) -> None:
        log_key = _run_log_key(record.workup_id)
        pipe = self.redis.pipeline()
        pipe.set(_analysis_key(record.id), record.model_dump_json(), ex=self.ttl_seconds)
        pipe.rpush(log_key, record.id)
        pipe.expire(log_key, self.ttl_seconds)
        pipe.execute()

    def list_for_workup(self, workup_id: str) -> list[AnalysisRecord]:
        """The Workup's runs, oldest first. Records that have expired are skipped."""
        ids = self.redis.lrange(_run_log_key(workup_id), 0, -1)
        if not ids:
            return []
        raw = self.redis.mget([_analysis_key(i.decode()) for i in ids])
        return [AnalysisRecord.model_validate_json(r) for r in raw if r is not None]


def get_store(redis: Annotated[Redis, Depends(get_redis)]) -> ResultStore:
    return RedisResultStore(redis, get_settings().result_ttl_seconds)
