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


def test_forgot_password(client: TestClient, student_user):
    """Test password reset flow."""
    response = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "student@test.com", "new_password": "newpass456"},
    )
    assert response.status_code == 200

    # Login with new password
    login = client.post(
        "/api/v1/auth/login",
        data={"username": "student@test.com", "password": "newpass456"},
    )
    assert login.status_code == 200

    # Old password should fail
    old_login = client.post(
        "/api/v1/auth/login",
        data={"username": "student@test.com", "password": "testpass123"},
    )
    assert old_login.status_code == 401


def test_forgot_password_nonexistent(client: TestClient):
    response = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "nobody@test.com", "new_password": "newpass"},
    )
    assert response.status_code == 404


def test_student_cannot_access_admin(client: TestClient, student_token: str):
    response = client.get("/api/v1/admin/users", headers=auth_headers(student_token))
    assert response.status_code == 403


def test_company_cannot_access_admin(client: TestClient, company_token: str):
    response = client.get("/api/v1/admin/users", headers=auth_headers(company_token))
    assert response.status_code == 403


def test_admin_can_access_admin(client: TestClient, admin_token: str):
    response = client.get("/api/v1/admin/users", headers=auth_headers(admin_token))
    assert response.status_code == 200


def test_register_all_roles(client: TestClient):
    """Test registration for each role."""
    for role in ["student", "company", "college_admin"]:
        response = client.post(
            "/api/v1/auth/register",
            json={"email": f"{role}@register.com", "password": "pass12345", "full_name": f"Test {role}", "role": role},
        )
        assert response.status_code == 201
        assert response.json()["role"] == role
