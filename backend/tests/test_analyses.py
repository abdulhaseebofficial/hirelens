"""Analysis endpoint tests, with Gemini stubbed out."""

from __future__ import annotations

import asyncio
import io

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.services import gemini
from tests.pypdf_stub import make_pdf

JD = (
    "We are hiring a Senior Python Engineer. Requirements: 5+ years of Python, "
    "FastAPI or Django, PostgreSQL, AWS, and strong testing discipline. "
    "You will own backend services end to end and mentor junior engineers."
)

FIT_MARKDOWN = """## FIT SCORE: 84/100

### Matched Requirements
- **Python:** 6 years across three roles.

### Missing/Weak Areas
- **AWS:** Only incidental exposure.

### Verdict
**Strong Fit:** Recommend an interview.
"""

SNAPSHOT_JSON = """{
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "phone": null,
    "linkedin": null,
    "summary": "Backend engineer.",
    "experience_years": "6",
    "current_role": "Senior Engineer",
    "current_company": "Analytical Engines Ltd",
    "skills": ["Python", "FastAPI"],
    "tools_technologies": ["PostgreSQL"],
    "education": [{"degree": "BSc", "institution": "Cambridge", "year": "2015"}],
    "key_achievements": ["Cut latency by 40%"],
    "languages": ["English"]
}"""


@pytest.fixture(autouse=True)
def stub_gemini(monkeypatch):
    """Answer by prompt shape, so no test ever calls the real API."""
    calls: list[str] = []

    async def fake_generate(prompt: str, *, purpose: str = "generation") -> str:
        calls.append(purpose)
        await asyncio.sleep(0)
        if purpose == "fit-score":
            return FIT_MARKDOWN
        if purpose == "snapshot":
            return SNAPSHOT_JSON
        return "## Role-Specific Questions\n\n### Question 1\n**Q:** Tell me about a project."

    # runner and the router both call gemini.generate by attribute, so one
    # patch on the module covers every call site.
    monkeypatch.setattr(gemini, "generate", fake_generate)
    return calls


def upload(name: str = "ada_lovelace_cv.pdf", body: str = "Ada Lovelace - Senior Engineer"):
    return ("files", (name, io.BytesIO(make_pdf(body)), "application/pdf"))


async def create_analysis(client: AsyncClient, *, files=None, jd: str = JD, title="Backend hire"):
    return await client.post(
        "/api/v1/analyses",
        data={"job_description": jd, "title": title},
        files=files or [upload()],
    )


async def wait_for_completion(client: AsyncClient, analysis_id: str, tries: int = 40) -> dict:
    """BackgroundTasks finish after the response; poll until the status settles."""
    for _ in range(tries):
        body = (await client.get(f"/api/v1/analyses/{analysis_id}")).json()
        if body["status"] in ("completed", "failed"):
            return body
        await asyncio.sleep(0.05)
    raise AssertionError(f"Analysis {analysis_id} never settled.")


class TestAuthorization:
    async def test_create_requires_authentication(self, client: AsyncClient):
        response = await create_analysis(client)
        assert response.status_code == 401

    async def test_list_requires_authentication(self, client: AsyncClient):
        assert (await client.get("/api/v1/analyses")).status_code == 401

    async def test_another_users_analysis_is_not_visible(self, auth_client: AsyncClient):
        analysis_id = (await create_analysis(auth_client)).json()["id"]
        await wait_for_completion(auth_client, analysis_id)

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as other:
            registered = await other.post(
                "/api/v1/auth/register",
                json={"email": "other@example.com", "password": "An0therPassphrase!"},
            )
            other.headers["Authorization"] = (
                f"Bearer {registered.json()['tokens']['access_token']}"
            )
            # 404, not 403 — a foreign id must not be distinguishable from a missing one.
            assert (await other.get(f"/api/v1/analyses/{analysis_id}")).status_code == 404


class TestValidation:
    async def test_rejects_short_job_description(self, auth_client: AsyncClient):
        response = await create_analysis(auth_client, jd="Too short")
        assert response.status_code == 422

    async def test_rejects_batch_over_the_limit(self, auth_client: AsyncClient):
        files = [upload(f"cv_{i}.pdf") for i in range(16)]
        response = await create_analysis(auth_client, files=files)
        assert response.status_code == 422

    async def test_rejects_a_non_pdf_upload(self, auth_client: AsyncClient):
        files = [("files", ("notes.pdf", io.BytesIO(b"just plain text"), "application/pdf"))]
        response = await create_analysis(auth_client, files=files)
        assert response.status_code == 422
        assert "could be read" in response.json()["error"]["message"]


class TestAnalysisLifecycle:
    async def test_returns_202_and_completes(self, auth_client: AsyncClient):
        response = await create_analysis(auth_client)
        assert response.status_code == 202
        body = response.json()
        assert body["status"] == "pending"
        assert body["candidate_count"] == 1

        finished = await wait_for_completion(auth_client, body["id"])
        assert finished["status"] == "completed"
        assert finished["progress"] == 1.0

        candidate = finished["candidates"][0]
        assert candidate["score"] == 84
        assert candidate["tier"] == "high"
        assert candidate["verdict"] == "Strong Fit"
        assert candidate["display_name"] == "Ada Lovelace"
        assert candidate["skills"] == ["Python", "FastAPI"]

    async def test_batch_is_ranked_by_score(self, auth_client: AsyncClient):
        files = [upload("a.pdf"), upload("b.pdf"), upload("c.pdf")]
        analysis_id = (await create_analysis(auth_client, files=files)).json()["id"]
        finished = await wait_for_completion(auth_client, analysis_id)

        assert finished["candidate_count"] == 3
        scores = [c["score"] for c in finished["candidates"]]
        assert scores == sorted(scores, reverse=True)

    async def test_unreadable_file_is_recorded_but_batch_continues(self, auth_client: AsyncClient):
        files = [
            upload("good.pdf"),
            ("files", ("broken.pdf", io.BytesIO(b"not a pdf"), "application/pdf")),
        ]
        analysis_id = (await create_analysis(auth_client, files=files)).json()["id"]
        finished = await wait_for_completion(auth_client, analysis_id)

        assert finished["status"] == "completed"
        by_status = {c["filename"]: c["status"] for c in finished["candidates"]}
        assert by_status["good.pdf"] == "completed"
        assert by_status["broken.pdf"] == "failed"

    async def test_history_lists_the_analysis(self, auth_client: AsyncClient):
        await create_analysis(auth_client, title="First role")
        response = await auth_client.get("/api/v1/analyses")
        assert response.status_code == 200
        body = response.json()
        assert body["total"] == 1
        assert body["items"][0]["title"] == "First role"
        assert body["has_more"] is False

    async def test_delete_removes_the_analysis(self, auth_client: AsyncClient):
        analysis_id = (await create_analysis(auth_client)).json()["id"]
        await wait_for_completion(auth_client, analysis_id)

        assert (await auth_client.delete(f"/api/v1/analyses/{analysis_id}")).status_code == 204
        assert (await auth_client.get(f"/api/v1/analyses/{analysis_id}")).status_code == 404


class TestCandidateEndpoints:
    async def test_interview_kit_is_generated_on_demand(self, auth_client: AsyncClient):
        analysis_id = (await create_analysis(auth_client)).json()["id"]
        finished = await wait_for_completion(auth_client, analysis_id)
        candidate_id = finished["candidates"][0]["id"]

        detail = (
            await auth_client.get(f"/api/v1/analyses/{analysis_id}/candidates/{candidate_id}")
        ).json()
        assert detail["interview_kit"] is None
        assert detail["has_interview_kit"] is False

        generated = await auth_client.post(
            f"/api/v1/analyses/{analysis_id}/candidates/{candidate_id}/interview-kit"
        )
        assert generated.status_code == 200
        assert "Role-Specific Questions" in generated.json()["interview_kit"]

    async def test_ranking_csv_export(self, auth_client: AsyncClient):
        analysis_id = (await create_analysis(auth_client)).json()["id"]
        await wait_for_completion(auth_client, analysis_id)

        response = await auth_client.get(f"/api/v1/analyses/{analysis_id}/export.csv")
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/csv")
        assert "Ada Lovelace" in response.text
        assert "Rank,Name,Score" in response.text

    async def test_fit_body_strips_the_score_heading(self, auth_client: AsyncClient):
        analysis_id = (await create_analysis(auth_client)).json()["id"]
        finished = await wait_for_completion(auth_client, analysis_id)
        candidate_id = finished["candidates"][0]["id"]

        response = await auth_client.get(
            f"/api/v1/analyses/{analysis_id}/candidates/{candidate_id}/fit-body"
        )
        markdown = response.json()["markdown"]
        assert not markdown.startswith("## FIT SCORE")
        assert "Matched Requirements" in markdown


class TestHealth:
    async def test_liveness(self, client: AsyncClient):
        response = await client.get("/api/v1/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"

    async def test_readiness_reports_each_dependency(self, client: AsyncClient):
        response = await client.get("/api/v1/health/ready")
        assert response.status_code == 200
        assert response.json()["checks"]["database"] == "ok"

    async def test_public_config_exposes_limits(self, client: AsyncClient):
        body = (await client.get("/api/v1/config")).json()
        assert body["max_batch_size"] == 15
        assert body["max_file_size_mb"] == 10
