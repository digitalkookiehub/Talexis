from fastapi.testclient import TestClient

from tests.conftest import auth_headers


def test_create_profile(client: TestClient, student_token: str):
    response = client.post(
        "/api/v1/students/profile",
        headers=auth_headers(student_token),
        json={
            "branch": "Computer Science",
            "department": "Engineering",
            "college_name": "Test University",
            "graduation_year": 2025,
            "skills": ["python", "react"],
            "interests": ["AI", "web dev"],
            "bio": "A passionate student",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["branch"] == "Computer Science"
    assert data["skills"] == ["python", "react"]


def test_get_profile(client: TestClient, student_token: str):
    # Profile is auto-created on GET
    response = client.get(
        "/api/v1/students/profile",
        headers=auth_headers(student_token),
    )
    assert response.status_code == 200
    assert "id" in response.json()


def test_update_profile(client: TestClient, student_token: str):
    # First create
    client.get("/api/v1/students/profile", headers=auth_headers(student_token))

    response = client.put(
        "/api/v1/students/profile",
        headers=auth_headers(student_token),
        json={"branch": "Data Science", "skills": ["python", "ml", "sql"]},
    )
    assert response.status_code == 200
    assert response.json()["branch"] == "Data Science"


def test_dashboard(client: TestClient, student_token: str):
    response = client.get(
        "/api/v1/students/dashboard",
        headers=auth_headers(student_token),
    )
    assert response.status_code == 200
    data = response.json()
    assert "total_interviews" in data
    assert "resume_uploaded" in data


def test_company_cannot_access_student_routes(client: TestClient, company_token: str):
    response = client.get(
        "/api/v1/students/profile",
        headers=auth_headers(company_token),
    )
    assert response.status_code == 403
