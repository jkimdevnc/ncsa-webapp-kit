"""The MOSAIC API. Everything lives under `/api/v1`.

Kubernetes probes:
- `livez`: the process is up. Never checks dependencies, so a Redis outage doesn't restart the pod.
- `readyz`: the API can serve requests (Redis answers). 503 takes the pod out of the load balancer.
"""

import logging
import sys
from contextlib import asynccontextmanager
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, FastAPI, Response
from pydantic import BaseModel
from redis import Redis, RedisError

from app.config import app_version, get_settings
from app.dictionary import Dictionary, load_dictionary
from app.redis_client import get_redis

logging.basicConfig(
    level=get_settings().log_level, stream=sys.stdout, format="%(asctime)s %(levelname)s %(name)s: %(message)s"
)
logger = logging.getLogger("mosaic")


class Livez(BaseModel):
    status: Literal["ok"]


class Readyz(BaseModel):
    status: Literal["ready", "not ready"]
    redis: Literal["ok", "down"]
    version: str


router = APIRouter(prefix="/api/v1")


@router.get("/livez")
def livez() -> Livez:
    return Livez(status="ok")


@router.get("/readyz", responses={503: {"model": Readyz, "description": "Not ready (e.g. Redis is down)"}})
def readyz(response: Response, redis: Annotated[Redis, Depends(get_redis)]) -> Readyz:
    try:
        redis.ping()
    except RedisError as e:
        logger.warning("readyz: Redis is down (%s)", type(e).__name__)
        response.status_code = 503
        return Readyz(status="not ready", redis="down", version=app_version())
    return Readyz(status="ready", redis="ok", version=app_version())


@router.get("/dictionary")
def dictionary() -> Dictionary:
    return load_dictionary()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load the dictionary at startup, so a broken data file stops the API right away with a clear error.
    d = load_dictionary()
    logger.info("dictionary %s loaded: %d variables", d.dictionary_version, len(d.variables))
    yield


app = FastAPI(title="MOSAIC API", version=app_version(), lifespan=lifespan)
app.include_router(router)
