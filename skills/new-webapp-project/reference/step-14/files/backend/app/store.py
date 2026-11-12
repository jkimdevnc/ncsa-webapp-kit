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

# A Workup's run log keeps at most this many runs; older ids are dropped when a new run is saved.
MAX_RUNS_PER_WORKUP = 100


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

    def list_for_workup(self, workup_id: str, owner: str) -> list[AnalysisRecord]: ...


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
        pipe.ltrim(log_key, -MAX_RUNS_PER_WORKUP, -1)
        pipe.expire(log_key, self.ttl_seconds)
        pipe.execute()

    def list_for_workup(self, workup_id: str, owner: str) -> list[AnalysisRecord]:
        """The owner's runs of the Workup, oldest first. Records that have expired are skipped, and their ids are
        removed from the run log so it doesn't keep growing."""
        log_key = _run_log_key(workup_id)
        ids = self.redis.lrange(log_key, 0, -1)
        if not ids:
            return []
        raw = self.redis.mget([_analysis_key(i.decode()) for i in ids])
        expired = [i for i, r in zip(ids, raw, strict=True) if r is None]
        if expired:
            pipe = self.redis.pipeline()
            for i in expired:
                pipe.lrem(log_key, 0, i)
            pipe.execute()
        records = [AnalysisRecord.model_validate_json(r) for r in raw if r is not None]
        return [r for r in records if r.owner == owner]


def get_store(redis: Annotated[Redis, Depends(get_redis)]) -> ResultStore:
    return RedisResultStore(redis, get_settings().result_ttl_seconds)
