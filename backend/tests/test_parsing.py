"""Unit tests for turning model output into structured values."""

from __future__ import annotations

import pytest

from app.models.analysis import FitTier
from app.services import parsing


class TestExtractScore:
    def test_reads_score_from_heading(self):
        assert parsing.extract_score("## FIT SCORE: 82/100\n\n### Matched") == 82

    def test_is_case_insensitive(self):
        assert parsing.extract_score("## fit score: 47/100") == 47

    def test_clamps_above_one_hundred(self):
        assert parsing.extract_score("## FIT SCORE: 150/100") == 100

    def test_returns_none_when_absent(self):
        assert parsing.extract_score("No score here.") is None

    def test_handles_empty_input(self):
        assert parsing.extract_score("") is None


class TestExtractVerdict:
    @pytest.mark.parametrize(
        ("text", "expected"),
        [
            ("**Strong Fit:** Great match.", "Strong Fit"),
            ("**Moderate Fit:** Some gaps.", "Moderate Fit"),
            ("**weak fit:** Not suitable.", "Weak Fit"),
            ("No verdict here", None),
        ],
    )
    def test_verdict_variants(self, text, expected):
        assert parsing.extract_verdict(text) == expected


class TestScoreTier:
    @pytest.mark.parametrize(
        ("score", "tier"),
        [
            (100, FitTier.HIGH),
            (75, FitTier.HIGH),
            (74, FitTier.MID),
            (50, FitTier.MID),
            (49, FitTier.LOW),
            (0, FitTier.LOW),
            (None, FitTier.MID),
        ],
    )
    def test_buckets(self, score, tier):
        assert parsing.score_tier(score) is tier


class TestParseJsonObject:
    def test_plain_json(self):
        data, error = parsing.parse_json_object('{"name": "Ada"}')
        assert error is None
        assert data == {"name": "Ada"}

    def test_strips_code_fence(self):
        data, error = parsing.parse_json_object('```json\n{"name": "Ada"}\n```')
        assert error is None
        assert data["name"] == "Ada"

    def test_extracts_object_from_surrounding_prose(self):
        raw = 'Sure! Here is the profile:\n{"name": "Ada", "skills": ["Python"]}\nHope that helps.'
        data, error = parsing.parse_json_object(raw)
        assert error is None
        assert data["skills"] == ["Python"]

    def test_ignores_braces_inside_strings(self):
        raw = '{"summary": "Used {braces} in a note", "name": "Ada"}'
        data, error = parsing.parse_json_object(raw)
        assert error is None
        assert data["name"] == "Ada"

    def test_unwraps_single_element_list(self):
        data, error = parsing.parse_json_object('[{"name": "Ada"}]')
        assert error is None
        assert data["name"] == "Ada"

    def test_reports_failure(self):
        data, error = parsing.parse_json_object("not json at all")
        assert data is None
        assert error


class TestNormalizeSnapshot:
    def test_nullish_values_become_none(self):
        result = parsing.normalize_snapshot({"name": "N/A", "email": "  ", "phone": "null"})
        assert result["name"] is None
        assert result["email"] is None
        assert result["phone"] is None

    def test_education_strings_are_accepted(self):
        result = parsing.normalize_snapshot({"education": ["BSc Computer Science"]})
        assert result["education"] == [
            {"degree": "BSc Computer Science", "institution": None, "year": None}
        ]

    def test_skill_dicts_are_flattened(self):
        result = parsing.normalize_snapshot({"skills": [{"skill": "Python"}, "SQL", None]})
        assert result["skills"] == ["Python", "SQL"]

    def test_non_list_skills_do_not_crash(self):
        result = parsing.normalize_snapshot({"skills": "Python, SQL"})
        assert result["skills"] == []

    def test_returns_none_for_non_dict(self):
        assert parsing.normalize_snapshot(None) is None
        assert parsing.normalize_snapshot(["a"]) is None


class TestStripScoreHeading:
    def test_removes_only_the_heading(self):
        raw = "## FIT SCORE: 80/100\n\n### Matched Requirements\n- Python"
        assert parsing.strip_score_heading(raw) == "### Matched Requirements\n- Python"
