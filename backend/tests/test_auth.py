import pytest

from app.seed import DEMO_EMAIL, DEMO_PASSWORD, seed_demo_user

LOGIN = {"email": DEMO_EMAIL, "password": DEMO_PASSWORD}


@pytest.fixture()
def demo_user(db_session):
    user, _ = seed_demo_user(db_session)
    return user


def test_login_success_sets_cookie(client, demo_user):
    response = client.post("/api/v1/auth/login", json=LOGIN)
    assert response.status_code == 200
    assert response.json() == {
        "id": demo_user.id,
        "email": DEMO_EMAIL,
        "display_name": "Alex Demo",
        "account_id": demo_user.account_id,
    }
    set_cookie = response.headers["set-cookie"].lower()
    assert "session=" in set_cookie
    assert "httponly" in set_cookie
    assert "samesite=lax" in set_cookie
    assert "max-age=28800" in set_cookie


def test_login_wrong_password(client, demo_user):
    response = client.post("/api/v1/auth/login", json={**LOGIN, "password": "nope"})
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "InvalidCredentials"
    assert "session" not in response.cookies


def test_login_unknown_email(client, demo_user):
    response = client.post("/api/v1/auth/login", json={**LOGIN, "email": "who@example.com"})
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "InvalidCredentials"


def test_me_without_cookie(client):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "NotAuthenticated"


def test_me_with_cookie(client, demo_user):
    client.post("/api/v1/auth/login", json=LOGIN)
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 200
    assert response.json()["email"] == DEMO_EMAIL
    assert response.json()["account_id"] == demo_user.account_id


def test_logout_invalidates_session(client, demo_user):
    client.post("/api/v1/auth/login", json=LOGIN)
    token = client.cookies.get("session")

    response = client.post("/api/v1/auth/logout")
    assert response.status_code == 200
    assert response.json() == {"message": "Logged out"}

    client.cookies.set("session", token)  # replay the old cookie
    assert client.get("/api/v1/auth/me").status_code == 401


def test_expired_session_rejected(client, demo_user, db_session):
    from datetime import datetime, timedelta, timezone

    from app.models import Session

    client.post("/api/v1/auth/login", json=LOGIN)
    session = db_session.get(Session, client.cookies.get("session"))
    session.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    db_session.commit()
    assert client.get("/api/v1/auth/me").status_code == 401


def test_seed_is_idempotent(db_session):
    first, created_first = seed_demo_user(db_session)
    second, created_second = seed_demo_user(db_session)
    assert created_first and not created_second
    assert first.id == second.id
