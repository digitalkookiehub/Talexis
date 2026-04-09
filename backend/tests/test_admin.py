from fastapi.testclient import TestClient

from tests.conftest import auth_headers


def test_list_users(client: TestClient, admin_token: str, student_user, company_user):
    response = client.get(
        "/api/v1/admin/users",
        headers=auth_headers(admin_token),
    )
    assert response.status_code == 200
    users = response.json()
    assert len(users) >= 3  # admin + student + company


def test_list_users_filter_by_role(client: TestClient, admin_token: str, student_user):
    response = client.get(
        "/api/v1/admin/users?role=student",
        headers=auth_headers(admin_token),
    )
    assert response.status_code == 200
    users = response.json()
    assert all(u["role"] == "student" for u in users)


def test_deactivate_user(client: TestClient, admin_token: str, student_user):
    response = client.delete(
        f"/api/v1/admin/users/{student_user.id}",
        headers=auth_headers(admin_token),
    )
    assert response.status_code == 204


def test_platform_stats(client: TestClient, admin_token: str):
    response = client.get(
        "/api/v1/admin/stats",
        headers=auth_headers(admin_token),
    )
    assert response.status_code == 200
    data = response.json()
    assert "total_users" in data
    assert "total_interviews" in data


def test_student_cannot_access_admin(client: TestClient, student_token: str):
    response = client.get(
        "/api/v1/admin/users",
        headers=auth_headers(student_token),
    )
    assert response.status_code == 403


def test_company_cannot_access_admin(client: TestClient, company_token: str):
    response = client.get(
        "/api/v1/admin/stats",
        headers=auth_headers(company_token),
    )
    assert response.status_code == 403
