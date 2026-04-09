from fastapi.testclient import TestClient

from tests.conftest import auth_headers


def test_create_company_profile(client: TestClient, company_token: str):
    response = client.post(
        "/api/v1/companies/profile",
        headers=auth_headers(company_token),
        json={
            "company_name": "TechCorp",
            "industry": "Technology",
            "size": "50-100",
            "website": "https://techcorp.com",
            "description": "A tech company",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["company_name"] == "TechCorp"


def test_get_company_profile(client: TestClient, company_token: str):
    # Create first
    client.post(
        "/api/v1/companies/profile",
        headers=auth_headers(company_token),
        json={"company_name": "TechCorp"},
    )

    response = client.get(
        "/api/v1/companies/profile",
        headers=auth_headers(company_token),
    )
    assert response.status_code == 200
    assert response.json()["company_name"] == "TechCorp"


def test_update_company_profile(client: TestClient, company_token: str):
    client.post(
        "/api/v1/companies/profile",
        headers=auth_headers(company_token),
        json={"company_name": "TechCorp"},
    )

    response = client.put(
        "/api/v1/companies/profile",
        headers=auth_headers(company_token),
        json={"industry": "FinTech", "size": "100-500"},
    )
    assert response.status_code == 200
    assert response.json()["industry"] == "FinTech"


def test_create_job_role(client: TestClient, company_token: str):
    client.post(
        "/api/v1/companies/profile",
        headers=auth_headers(company_token),
        json={"company_name": "TechCorp"},
    )

    response = client.post(
        "/api/v1/jobs",
        headers=auth_headers(company_token),
        json={
            "title": "Backend Developer",
            "description": "Build APIs",
            "required_skills": ["python", "fastapi"],
            "min_readiness_score": 60.0,
        },
    )
    assert response.status_code == 201
    assert response.json()["title"] == "Backend Developer"


def test_list_jobs(client: TestClient, company_token: str):
    client.post(
        "/api/v1/companies/profile",
        headers=auth_headers(company_token),
        json={"company_name": "TechCorp"},
    )
    client.post(
        "/api/v1/jobs",
        headers=auth_headers(company_token),
        json={"title": "Job 1"},
    )
    client.post(
        "/api/v1/jobs",
        headers=auth_headers(company_token),
        json={"title": "Job 2"},
    )

    response = client.get("/api/v1/jobs", headers=auth_headers(company_token))
    assert response.status_code == 200
    assert len(response.json()) == 2


def test_student_cannot_access_company_routes(client: TestClient, student_token: str):
    response = client.get(
        "/api/v1/companies/profile",
        headers=auth_headers(student_token),
    )
    assert response.status_code == 403
