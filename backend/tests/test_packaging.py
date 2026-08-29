"""Guards the one place this project keeps the same information twice.

Vercel installs the API from pyproject.toml; the Docker image installs it from
requirements.txt. Nothing at runtime reconciles the two, so a dependency added
to one and not the other only shows up as an ImportError in whichever
environment was missed.
"""

from __future__ import annotations

import tomllib
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent


def _requirements() -> list[str]:
    text = (BACKEND / "requirements.txt").read_text(encoding="utf-8")
    return [
        line.strip()
        for line in text.splitlines()
        if line.strip() and not line.strip().startswith("#")
    ]


def _pyproject_dependencies() -> list[str]:
    with (BACKEND / "pyproject.toml").open("rb") as handle:
        return tomllib.load(handle)["project"]["dependencies"]


def test_dependency_lists_match():
    assert _pyproject_dependencies() == _requirements()


def test_vercel_entrypoint_points_at_the_app():
    with (BACKEND / "pyproject.toml").open("rb") as handle:
        config = tomllib.load(handle)
    assert config["tool"]["vercel"]["entrypoint"] == "app.main:app"
