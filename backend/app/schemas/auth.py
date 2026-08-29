"""Auth request/response contracts."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.config import settings


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)
    full_name: str | None = Field(default=None, max_length=200)

    @field_validator("password")
    @classmethod
    def _strong_enough(cls, value: str) -> str:
        if len(value) < settings.password_min_length:
            raise ValueError(
                f"Password must be at least {settings.password_min_length} characters."
            )
        if value.isdigit() or value.isalpha():
            raise ValueError("Password must mix letters with numbers or symbols.")
        return value

    @field_validator("full_name")
    @classmethod
    def _trim(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    full_name: str | None
    is_active: bool
    created_at: datetime
    last_login_at: datetime | None


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = Field(description="Access token lifetime in seconds.")


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=1)


class AuthResponse(BaseModel):
    user: UserRead
    tokens: TokenPair


class MessageResponse(BaseModel):
    message: str
