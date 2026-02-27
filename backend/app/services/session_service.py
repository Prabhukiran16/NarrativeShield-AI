from __future__ import annotations

import uuid
from dataclasses import dataclass


@dataclass(frozen=True)
class SessionUser:
    user_id: str
    email: str
    name: str


class SessionService:
    def __init__(self) -> None:
        self._active_sessions: dict[str, SessionUser] = {}

    def create_session(self, *, user_id: str, email: str, name: str) -> tuple[str, SessionUser]:
        session_user = SessionUser(user_id=user_id, email=email, name=name)

        token = str(uuid.uuid4())
        self._active_sessions[token] = session_user
        return token, session_user

    def get_user(self, token: str) -> SessionUser | None:
        return self._active_sessions.get(token)

    def logout(self, token: str) -> bool:
        existed = token in self._active_sessions
        self._active_sessions.pop(token, None)
        return existed
