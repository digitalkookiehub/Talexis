from fastapi.testclient import TestClient

from tests.conftest import auth_headers


def test_register_success(client: TestClient):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "new@test.com",
            "password": "securepass123",
            "full_name": "New User",
            "role": "student",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "new@test.com"
    assert data["role"] == "student"


def test_register_duplicate_email(client: TestClient, student_user):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "student@test.com",
            "password": "pass123456",
            "full_name": "Duplicate",
            "role": "student",
        },
    )
    assert response.status_code == 409


def test_login_success(client: TestClient, student_user):
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "student@test.com", "password": "testpass123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password(client: TestClient, student_user):
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "student@test.com", "password": "wrongpass"},
    )
    assert response.status_code == 401


def test_login_nonexistent_user(client: TestClient):
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "nobody@test.com", "password": "pass"},
    )
    assert response.status_code == 401


def test_me_authenticated(client: TestClient, student_token: str):
    response = client.get("/api/v1/auth/me", headers=auth_headers(student_token))
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "student@test.com"
    assert data["role"] == "student"


def test_me_unauthenticated(client: TestClient):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_update_profile(client: TestClient, student_token: str):
    response = client.put(
        "/api/v1/auth/me",
        headers=auth_headers(student_token),
        json={"full_name": "Updated Name"},
    )
    assert response.status_code == 200
    assert response.json()["full_name"] == "Updated Name"


def test_refresh_token(client: TestClient, student_user):
    login = client.post(
        "/api/v1/auth/login",
        data={"username": "student@test.com", "password": "testpass123"},
    )
    refresh_token = login.json()["refresh_token"]

    response = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_logout(client: TestClient, student_user):
    login = client.post(
        "/api/v1/auth/login",
        data={"username": "student@test.com", "password": "testpass123"},
    )
    refresh_token = login.json()["refresh_token"]

    response = client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": refresh_token},
    )
    assert response.status_code == 204
