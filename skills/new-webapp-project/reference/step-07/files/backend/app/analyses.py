"""Analyze and the run log.

The entered values arrive only in `POST /analyses` (docs/decisions/0003). They are checked, passed to the model, and
dropped: they are never stored or logged. Only the outputs and the variable codes are kept.
"""

import logging
import uuid
from datetime import UTC, datetime
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Path
from pydantic import BaseModel, Field

from app.auth import current_user
from app.dictionary import load_dictionary
from app.model_catalog import DEFAULT_MODEL_ID, MODEL_CATALOG, ModelSpec
from app.runner import Runner, get_runner
from app.store import AnalysisRecord, ResultStore, get_store

logger = logging.getLogger("mosaic.analyses")

WORKUP_ID_PATTERN = r"^[A-Za-z0-9-]{1,64}$"


class AnalysisRequest(BaseModel):
    workup_id: str = Field(pattern=WORKUP_ID_PATTERN, description="The id the browser gave the Workup")
    model_id: str = DEFAULT_MODEL_ID
    values: dict[str, float] = Field(description="Entered values, keyed by dictionary variable code")


class AnalysisResponse(BaseModel):
    """Ready for a job queue: today the status is always final in this response."""

    id: str
    status: Literal["succeeded"]
    result: dict[str, Any] | None = None
    error: str | None = None


def _invalid(field: str, msg: str) -> dict[str, Any]:
    # Same shape as FastAPI's own 422 errors. Messages never include the entered value.
    return {"loc": ["body", *field.split(".")], "msg": msg, "type": "value_error"}


def _check(request: AnalysisRequest) -> ModelSpec:
    spec = MODEL_CATALOG.get(request.model_id)
    if spec is None:
        raise HTTPException(422, [_invalid("model_id", f"Unknown model '{request.model_id}'")])

    variables = {v.code: v for v in load_dictionary().variables}
    errors = [
        _invalid(f"values.{code}", f"{code} is required by this model")
        for code in spec.inputs
        if code not in request.values
    ]
    for code, value in request.values.items():
        variable = variables.get(code)
        if variable is None:
            errors.append(_invalid(f"values.{code}", f"{code} is not in the dictionary"))
            continue
        r = variable.possible_range
        if not r.min <= value <= r.max:
            errors.append(
                _invalid(f"values.{code}", f"{code} is not possible: outside {r.min:g}–{r.max:g} {variable.unit}")
            )
    if errors:
        raise HTTPException(422, errors)
    return spec


router = APIRouter()


@router.post("/analyses")
def create_analysis(
    request: AnalysisRequest,
    owner: Annotated[str, Depends(current_user)],
    runner: Annotated[Runner, Depends(get_runner)],
    store: Annotated[ResultStore, Depends(get_store)],
) -> AnalysisResponse:
    spec = _check(request)
    outputs = runner.run(spec.id, request.values)
    record = AnalysisRecord(
        id=uuid.uuid4().hex,
        workup_id=request.workup_id,
        owner=owner,
        created_at=datetime.now(UTC),
        model_id=spec.id,
        model_version=spec.version,
        dictionary_version=load_dictionary().dictionary_version,
        variables_used=list(spec.inputs),
        outputs=outputs,
    )
    store.save(record)
    logger.info("analysis %s: model %s %s, variables %s", record.id, spec.id, spec.version, ",".join(spec.inputs))
    return AnalysisResponse(id=record.id, status="succeeded", result=outputs)


@router.get("/workups/{workup_id}/analyses")
def run_log(
    workup_id: Annotated[str, Path(pattern=WORKUP_ID_PATTERN)],
    store: Annotated[ResultStore, Depends(get_store)],
) -> list[AnalysisRecord]:
    return store.list_for_workup(workup_id)
