# The API image. Build context: backend/. Built for the machine's own architecture (arm64 on the Mac, amd64 in CI);
# Step 14 builds both and pushes them.

# Build stage: install the locked dependencies with uv, then train the demo model into the image.
FROM ghcr.io/astral-sh/uv:python3.15-trixie-slim AS build

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    UV_PROJECT_ENVIRONMENT=/app/.venv

WORKDIR /app
COPY pyproject.toml uv.lock .python-version ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

COPY app ./app
COPY scripts ./scripts
# The demo model ships inside the image, so it starts on its own. Real models can come from a mounted ARTIFACT_DIR.
RUN ARTIFACT_DIR=/app/ml_artifacts /app/.venv/bin/python -m scripts.train_demo_model

# Run stage: Python and the app only (no uv, no build tools, no tests), as a non-root user.
FROM python:3.15-slim-trixie

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    ARTIFACT_DIR=/app/ml_artifacts

RUN useradd --uid 10001 --no-create-home --shell /usr/sbin/nologin mosaic

WORKDIR /app
# pyproject.toml is read at runtime for the API version (app/config.py).
COPY --from=build /app/.venv ./.venv
COPY --from=build /app/ml_artifacts ./ml_artifacts
COPY pyproject.toml ./
COPY app ./app

USER 10001
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
