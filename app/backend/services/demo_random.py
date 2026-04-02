"""
Stdlib ``random`` for non-cryptographic use only: mock data, demos, UI variance.
Never use for tokens, sessions, or secrets — use :mod:`secrets` instead.
"""

from __future__ import annotations

import random
from typing import Any, Sequence, TypeVar

_T = TypeVar("_T")


def uniform(a: float, b: float) -> float:
    return random.uniform(a, b)  # NOSONAR


def choice(seq: Sequence[_T]) -> _T:
    return random.choice(seq)  # NOSONAR


def randint(a: int, b: int) -> int:
    return random.randint(a, b)  # NOSONAR


def sample(population: Sequence[Any], k: int) -> list[Any]:
    return random.sample(population, k)  # NOSONAR
