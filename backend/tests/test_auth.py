"""Authentication flow tests."""

from __future__ import annotations

from httpx import AsyncClient

from tests.conftest import TEST_EMAIL, TEST_PASSWORD


async def register(client: AsyncClient, **overrides):
    payload = {"email": TEST_EMAIL, "password": TEST_PASSWORD, "full_name": "Test Recruiter"}
    payload.update(overrides)
    return await client.post("/api/v1/auth/register", json=payload)


class TestRegister:
    async def test_creates_account_and_returns_tokens(self, client: AsyncClient):
        response = await register(client)
        assert response.status_code == 201
        body = response.json()
        assert body["user"]["email"] == TEST_EMAIL
        assert body["tokens"]["access_token"]
        assert body["tokens"]["refresh_token"]
        assert "password" not in str(body["user"])

    async def test_rejects_duplicate_email(self, client: AsyncClient):
        await register(client)
        response = await register(client)
        assert response.status_code == 409
        assert response.json()["error"]["code"] == "conflict"

    async def test_email_is_case_insensitive(self, client: AsyncClient):
        await register(client)
        response = await register(client, email=TEST_EMAIL.upper())
        assert response.status_code == 409

    async def test_rejects_short_password(self, client: AsyncClient):
        response = await register(client, password="short1!")
        assert response.status_code == 422

    async def test_rejects_letters_only_password(self, client: AsyncClient):
        response = await register(client, password="onlylettershere")
        assert response.status_code == 422

    async def test_rejects_invalid_email(self, client: AsyncClient):
        response = await register(client, email="not-an-email")
        assert response.status_code == 422


class TestLogin:
    async def test_succeeds_with_correct_credentials(self, client: AsyncClient):
        await register(client)
        response = await client.post(
            "/api/v1/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        assert response.json()["tokens"]["access_token"]

    async def test_rejects_wrong_password(self, client: AsyncClient):
        await register(client)
        response = await client.post(
            "/api/v1/auth/login", json={"email": TEST_EMAIL, "password": "WrongPassphrase1!"}
        )
        assert response.status_code == 401

    async def test_unknown_email_looks_the_same_as_wrong_password(self, client: AsyncClient):
        response = await client.post(
            "/api/v1/auth/login", json={"email": "nobody@example.com", "password": TEST_PASSWORD}
        )
        assert response.status_code == 401
        assert response.json()["error"]["message"] == "Incorrect email or password."


class TestProtectedRoutes:
    async def test_me_requires_a_token(self, client: AsyncClient):
        assert (await client.get("/api/v1/auth/me")).status_code == 401

    async def test_me_rejects_a_garbage_token(self, client: AsyncClient):
        client.headers["Authorization"] = "Bearer not.a.jwt"
        assert (await client.get("/api/v1/auth/me")).status_code == 401

    async def test_me_returns_the_signed_in_user(self, auth_client: AsyncClient):
        response = await auth_client.get("/api/v1/auth/me")
        assert response.status_code == 200
        assert response.json()["email"] == TEST_EMAIL

    async def test_refresh_token_is_rejected_as_an_access_token(self, client: AsyncClient):
        refresh_token = (await register(client)).json()["tokens"]["refresh_token"]
        client.headers["Authorization"] = f"Bearer {refresh_token}"
        assert (await client.get("/api/v1/auth/me")).status_code == 401


class TestRefreshRotation:
    async def test_refresh_returns_a_new_pair(self, client: AsyncClient):
        tokens = (await register(client)).json()["tokens"]
        response = await client.post(
            "/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
        )
        assert response.status_code == 200
        assert response.json()["refresh_token"] != tokens["refresh_token"]

    async def test_old_refresh_token_cannot_be_reused(self, client: AsyncClient):
        tokens = (await register(client)).json()["tokens"]
        first = await client.post(
            "/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
        )
        assert first.status_code == 200

        replay = await client.post(
            "/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
        )
        assert replay.status_code == 401

    async def test_logout_revokes_the_refresh_token(self, client: AsyncClient):
        tokens = (await register(client)).json()["tokens"]
        logout = await client.post(
            "/api/v1/auth/logout", json={"refresh_token": tokens["refresh_token"]}
        )
        assert logout.status_code == 200
        response = await client.post(
            "/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
        )
        assert response.status_code == 401

    async def test_logout_of_unknown_token_is_a_no_op(self, client: AsyncClient):
        response = await client.post("/api/v1/auth/logout", json={"refresh_token": "garbage"})
        assert response.status_code == 200
