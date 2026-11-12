"""Write the API's OpenAPI spec as JSON, by default to `frontend/openapi.json`. Run it with `make gen-api`.

The frontend's typed client is generated from this file (docs/decisions/0004), and `make check-openapi` fails when
the committed copy no longer matches the API. Building the spec doesn't start the app, so Redis and the model aren't
needed.
"""

import json
import sys
from pathlib import Path

from app.main import app

DEFAULT_PATH = Path(__file__).resolve().parents[2] / "frontend" / "openapi.json"


def main() -> None:
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PATH
    path.write_text(json.dumps(app.openapi(), indent=2, ensure_ascii=False) + "\n")
    print(f"Wrote {path}")


if __name__ == "__main__":
    main()
