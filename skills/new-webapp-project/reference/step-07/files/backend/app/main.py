"""The MOSAIC API. Everything lives under `/api/v1`.

Kubernetes probes:
- `livez`: the process is up. Never checks dependencies, so a Redis outage doesn't restart the pod.
- `readyz`: the API can serve requests (Redis answers and the model is loaded). 503 takes the pod out of the load
  balancer.
"""

import logging
import sys
from contextlib import asynccontextmanager
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, FastAPI, Response
from pydantic import BaseModel
from redis import Redis, RedisError

from app import analyses
from app.config import app_version, get_settings
from app.dictionary import Dictionary, load_dictionary
from app.model_catalog import DEFAULT_MODEL_ID, require_model_spec
from app.model_runtime import is_loaded, load_model
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
    model: Literal["loaded", "not loaded"]
    model_id: str
    model_version: str
    version: str


router = APIRouter(prefix="/api/v1")


@router.get("/livez")
def livez() -> Livez:
    return Livez(status="ok")


@router.get(
    "/readyz", responses={503: {"model": Readyz, "description": "Not ready (Redis is down or the model isn't loaded)"}}
)
def readyz(response: Response, redis: Annotated[Redis, Depends(get_redis)]) -> Readyz:
    try:
        redis.ping()
        redis_ok = True
    except RedisError as e:
        logger.warning("readyz: Redis is down (%s)", type(e).__name__)
        redis_ok = False
    model_ok = is_loaded(DEFAULT_MODEL_ID)
    spec = require_model_spec(DEFAULT_MODEL_ID)
    ready = redis_ok and model_ok
    if not ready:
        response.status_code = 503
    return Readyz(
        status="ready" if ready else "not ready",
        redis="ok" if redis_ok else "down",
        model="loaded" if model_ok else "not loaded",
        model_id=spec.id,
        model_version=spec.version,
        version=app_version(),
    )


@router.get("/dictionary")
def dictionary() -> Dictionary:
    return load_dictionary()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load the dictionary and the model at startup, so a broken or missing file stops the API right away with a clear
    # error.
    d = load_dictionary()
    logger.info("dictionary %s loaded: %d variables", d.dictionary_version, len(d.variables))
    load_model(DEFAULT_MODEL_ID)
    logger.info("model %s %s loaded", DEFAULT_MODEL_ID, require_model_spec(DEFAULT_MODEL_ID).version)
    yield


router.include_router(analyses.router)

app = FastAPI(title="MOSAIC API", version=app_version(), lifespan=lifespan)
app.include_router(router)
