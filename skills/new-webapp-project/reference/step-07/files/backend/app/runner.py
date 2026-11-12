"""How an analysis is run. Swap point: a `QueueRunner` (RQ worker + polling) can replace `DirectRunner` later.

See docs/decisions/0002: today the model runs directly while the request is being handled.
"""

from typing import Any, Protocol

from app.model_runtime import predict


class Runner(Protocol):
    def run(self, model_id: str, values: dict[str, float]) -> dict[str, Any]: ...


class DirectRunner:
    def run(self, model_id: str, values: dict[str, float]) -> dict[str, Any]:
        return predict(model_id, values)


def get_runner() -> Runner:
    return DirectRunner()
