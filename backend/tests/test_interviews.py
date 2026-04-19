from fastapi.testclient import TestClient

from tests.conftest import auth_headers


def test_start_interview(client: TestClient, student_token: str):
    response = client.post(
        "/api/v1/interviews/start",
        headers=auth_headers(student_token),
        json={
            "interview_type": "technical",
            "difficulty_level": "basic",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["interview_type"] == "technical"
    assert data["difficulty_level"] == "basic"
    assert data["status"] == "in_progress"


def test_get_interview(client: TestClient, student_token: str):
    # Start one first
    create = client.post(
        "/api/v1/interviews/start",
        headers=auth_headers(student_token),
        json={"interview_type": "hr", "difficulty_level": "basic"},
    )
    interview_id = create.json()["id"]

    response = client.get(
        f"/api/v1/interviews/{interview_id}",
        headers=auth_headers(student_token),
    )
    assert response.status_code == 200
    assert response.json()["id"] == interview_id


def test_complete_interview(client: TestClient, student_token: str):
    create = client.post(
        "/api/v1/interviews/start",
        headers=auth_headers(student_token),
        json={"interview_type": "behavioral", "difficulty_level": "basic"},
    )
    assert create.status_code == 201, f"Start failed: {create.text}"
    interview_id = create.json()["id"]

    response = client.post(
        f"/api/v1/interviews/{interview_id}/complete",
        headers=auth_headers(student_token),
    )
    assert response.status_code == 200
    assert response.json()["status"] in ("completed", "evaluated")


def test_company_cannot_start_interview(client: TestClient, company_token: str):
    response = client.post(
        "/api/v1/interviews/start",
        headers=auth_headers(company_token),
        json={"interview_type": "hr", "difficulty_level": "basic"},
    )
    assert response.status_code == 403
