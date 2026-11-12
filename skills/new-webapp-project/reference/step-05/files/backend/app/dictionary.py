"""The data dictionary: which variables exist and what values are possible. It is data, not code.

Adding variables means editing `data/dictionary_v<N>.json`; this module only loads and validates it.
"""

from functools import lru_cache
from pathlib import Path
from typing import Self

from pydantic import BaseModel, Field, model_validator

DICTIONARY_FILE = Path(__file__).resolve().parent / "data" / "dictionary_v0.json"


class PossibleRange(BaseModel):
    """Values outside this range are not possible: the UI shows an error and Analyze is blocked."""

    min: float
    max: float

    @model_validator(mode="after")
    def min_below_max(self) -> Self:
        if self.min >= self.max:
            raise ValueError(f"min ({self.min}) must be below max ({self.max})")
        return self


class Variable(BaseModel):
    code: str
    name: str
    region: str
    group: str
    unit: str
    precision: float = Field(gt=0, description="Recording step, e.g. 0.1 mm")
    possible_range: PossibleRange
    range_source: str = Field(description="Where the range comes from; placeholders say so")


class Dictionary(BaseModel):
    dictionary_version: str
    variables: list[Variable] = Field(min_length=1)

    @model_validator(mode="after")
    def codes_are_unique(self) -> Self:
        codes = [v.code for v in self.variables]
        duplicates = sorted({c for c in codes if codes.count(c) > 1})
        if duplicates:
            raise ValueError(f"duplicate variable codes: {', '.join(duplicates)}")
        return self


def read_dictionary(path: Path) -> Dictionary:
    return Dictionary.model_validate_json(path.read_text())


@lru_cache
def load_dictionary() -> Dictionary:
    return read_dictionary(DICTIONARY_FILE)
