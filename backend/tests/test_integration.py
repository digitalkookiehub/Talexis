"""End-to-end API integration tests covering full user flows across all roles."""
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.conftest import auth_headers
from app.models.student import StudentProfile
from app.models.company import Company
from app.models.talent_profile import TalentProfile
from app.models.enums import Recommendation
from datetime import datetime, timezone


# ===== Student Flow =====

class TestStudentFlow:
    def test_full_student_journey(self, client: TestClient, student_token: str, db: Session):
        """Register → profile → start interview → complete → check readiness."""
        h = auth_headers(student_token)

        # Create profile
        r = client.get("/api/v1/students/profile", headers=h)
        assert r.status_code == 200

        # Update profile
        r = client.put("/api/v1/students/profile", headers=h, json={
            "branch": "Computer Science", "college_name": "Test Uni", "skills": ["Python", "React"],
        })
        assert r.status_code == 200
        assert r.json()["branch"] == "Computer Science"

        # Dashboard
        r = client.get("/api/v1/students/dashboard", headers=h)
        assert r.status_code == 200
        assert "total_interviews" in r.json()

        # Start interview
        r = client.post("/api/v1/interviews/start", headers=h, json={
            "interview_type": "hr", "difficulty_level": "basic", "target_questions": 3,
        })
        assert r.status_code == 201
        iv_id = r.json()["id"]

        # Get interview
        r = client.get(f"/api/v1/interviews/{iv_id}", headers=h)
        assert r.status_code == 200
        assert r.json()["status"] == "in_progress"

        # Complete
        r = client.post(f"/api/v1/interviews/{iv_id}/complete", headers=h)
        assert r.status_code == 200

        # History
        r = client.get("/api/v1/interviews/history", headers=h)
        assert r.status_code == 200
        assert r.json()["total"] >= 1

        # Readiness
        r = client.post("/api/v1/readiness/calculate", headers=h)
        assert r.status_code == 200

    def test_interview_attempts_endpoint(self, client: TestClient, student_token: str):
        h = auth_headers(student_token)
        r = client.get("/api/v1/interviews/attempts", headers=h)
        assert r.status_code == 200
        assert "unlocks" in r.json()

    def test_active_interview(self, client: TestClient, student_token: str):
        h = auth_headers(student_token)
        # Start one
        client.post("/api/v1/interviews/start", headers=h, json={
            "interview_type": "technical", "difficulty_level": "basic",
        })
        r = client.get("/api/v1/interviews/active", headers=h)
        assert r.status_code == 200
        assert r.json() is not None

    def test_abandon_interview(self, client: TestClient, student_token: str):
        h = auth_headers(student_token)
        create = client.post("/api/v1/interviews/start", headers=h, json={
            "interview_type": "sales", "difficulty_level": "basic",
        })
        iv_id = create.json()["id"]
        r = client.delete(f"/api/v1/interviews/{iv_id}", headers=h)
        assert r.status_code == 204


# ===== Company Flow =====

class TestCompanyFlow:
    def _setup_company(self, client, company_token, db):
        h = auth_headers(company_token)
        # Create company profile
        r = client.post("/api/v1/companies/profile", headers=h, json={
            "company_name": "TestCorp", "industry": "Technology", "size": "10-50",
        })
        if r.status_code == 409:
            pass  # already exists
        return h

    def test_company_profile_crud(self, client: TestClient, company_token: str, db: Session):
        h = self._setup_company(client, company_token, db)

        r = client.get("/api/v1/companies/profile", headers=h)
        assert r.status_code == 200
        assert r.json()["company_name"] == "TestCorp"

        r = client.put("/api/v1/companies/profile", headers=h, json={"description": "Updated"})
        assert r.status_code == 200

    def test_job_crud(self, client: TestClient, company_token: str, db: Session):
        h = self._setup_company(client, company_token, db)

        # Create job
        r = client.post("/api/v1/jobs", headers=h, json={
            "title": "Backend Dev", "required_skills": ["Python", "FastAPI"],
        })
        assert r.status_code == 201
        job_id = r.json()["id"]

        # List jobs
        r = client.get("/api/v1/jobs", headers=h)
        assert r.status_code == 200

        # Update job
        r = client.put(f"/api/v1/jobs/{job_id}", headers=h, json={"title": "Senior Backend Dev"})
        assert r.status_code == 200
        assert r.json()["title"] == "Senior Backend Dev"

        # Delete job
        r = client.delete(f"/api/v1/jobs/{job_id}", headers=h)
        assert r.status_code == 204

    def test_browse_talent_pool(self, client: TestClient, company_token: str, db: Session):
        h = self._setup_company(client, company_token, db)

        # Create a visible talent for testing
        sp = StudentProfile(user_id=1, college_name="Test Uni")
        db.add(sp)
        db.flush()
        tp = TalentProfile(
            student_id=sp.id, candidate_code="TAL-TEST1234",
            is_visible=True, consent_given=True,
            skill_scores={"communication": 7, "technical": 8, "confidence": 6, "structure": 7},
            recommendation=Recommendation.yes,
        )
        db.add(tp)
        db.commit()

        r = client.get("/api/v1/talents", headers=h)
        assert r.status_code == 200
        assert r.json()["total"] >= 1

    def test_schedule_interview(self, client: TestClient, company_token: str, db: Session):
        h = self._setup_company(client, company_token, db)

        r = client.post("/api/v1/schedules", headers=h, json={
            "candidate_type": "external",
            "candidate_name": "External Candidate",
            "candidate_email": "ext@test.com",
            "scheduled_at": "2026-05-01T10:00:00Z",
            "duration_minutes": 30,
            "interview_type": "technical",
        })
        assert r.status_code == 201
        assert r.json()["candidate_name"] == "External Candidate"
        assert r.json()["status"] == "scheduled"

        sched_id = r.json()["id"]

        # List schedules
        r = client.get("/api/v1/schedules", headers=h)
        assert r.status_code == 200
        assert r.json()["total"] >= 1

        # Complete
        r = client.post(f"/api/v1/schedules/{sched_id}/complete", headers=h)
        assert r.status_code == 200
        assert r.json()["status"] == "completed"

        # Submit feedback
        r = client.post(f"/api/v1/schedules/{sched_id}/feedback", headers=h, json={
            "rating": 4, "notes": "Good candidate", "outcome": "next_round",
        })
        assert r.status_code == 200
        assert r.json()["feedback_rating"] == 4

    def test_company_analytics(self, client: TestClient, company_token: str, db: Session):
        h = self._setup_company(client, company_token, db)
        r = client.get("/api/v1/analytics/company", headers=h)
        assert r.status_code == 200
        assert "available_talent_pool" in r.json()


# ===== Admin Flow =====

class TestAdminFlow:
    def test_admin_stats(self, client: TestClient, admin_token: str):
        h = auth_headers(admin_token)
        r = client.get("/api/v1/admin/stats", headers=h)
        assert r.status_code == 200
        assert "total_users" in r.json()

    def test_admin_list_users(self, client: TestClient, admin_token: str, student_user):
        h = auth_headers(admin_token)
        r = client.get("/api/v1/admin/users", headers=h)
        assert r.status_code == 200
        assert len(r.json()) >= 2  # admin + student

    def test_admin_filter_users_by_role(self, client: TestClient, admin_token: str, student_user):
        h = auth_headers(admin_token)
        r = client.get("/api/v1/admin/users?role=student", headers=h)
        assert r.status_code == 200
        for user in r.json():
            assert user["role"] == "student"

    def test_admin_deactivate_user(self, client: TestClient, admin_token: str, student_user):
        h = auth_headers(admin_token)
        r = client.delete(f"/api/v1/admin/users/{student_user.id}", headers=h)
        assert r.status_code == 204

    def test_admin_update_user_role(self, client: TestClient, admin_token: str, student_user):
        h = auth_headers(admin_token)
        r = client.put(f"/api/v1/admin/users/{student_user.id}", headers=h, params={"role": "company"})
        assert r.status_code == 200
        assert r.json()["role"] == "company"

    def test_platform_analytics(self, client: TestClient, admin_token: str):
        h = auth_headers(admin_token)
        r = client.get("/api/v1/analytics/platform", headers=h)
        assert r.status_code == 200
        assert "users_by_role" in r.json()

    def test_anticheat_report(self, client: TestClient, admin_token: str):
        h = auth_headers(admin_token)
        r = client.get("/api/v1/anticheat/report", headers=h)
        assert r.status_code == 200
        assert "total_flags" in r.json()


# ===== College Admin Flow =====

class TestCollegeFlow:
    def test_college_profile(self, client: TestClient, college_token: str):
        h = auth_headers(college_token)
        r = client.get("/api/v1/college/profile", headers=h)
        assert r.status_code == 200
        assert r.json()["college_name"] == "Test University"

    def test_college_students(self, client: TestClient, college_token: str, db: Session, student_user):
        # Create student in the same college
        sp = StudentProfile(user_id=student_user.id, college_name="Test University", branch="CS")
        db.add(sp)
        db.commit()

        h = auth_headers(college_token)
        r = client.get("/api/v1/college/students", headers=h)
        assert r.status_code == 200
        assert r.json()["total"] >= 1
        assert r.json()["college_name"] == "Test University"

    def test_college_analytics(self, client: TestClient, college_token: str):
        h = auth_headers(college_token)
        r = client.get("/api/v1/college/analytics", headers=h)
        assert r.status_code == 200
        assert "total_students" in r.json()

    def test_college_cannot_access_admin(self, client: TestClient, college_token: str):
        h = auth_headers(college_token)
        r = client.get("/api/v1/admin/users", headers=h)
        assert r.status_code == 403


# ===== Cross-role Access Guards =====

class TestAccessGuards:
    def test_student_cannot_browse_talent(self, client: TestClient, student_token: str):
        r = client.get("/api/v1/talents", headers=auth_headers(student_token))
        assert r.status_code == 403

    def test_company_cannot_start_interview(self, client: TestClient, company_token: str):
        r = client.post("/api/v1/interviews/start", headers=auth_headers(company_token),
                        json={"interview_type": "hr", "difficulty_level": "basic"})
        assert r.status_code == 403

    def test_unauthenticated_blocked(self, client: TestClient):
        for path in ["/api/v1/interviews/start", "/api/v1/students/profile", "/api/v1/talents", "/api/v1/admin/users"]:
            r = client.get(path)
            assert r.status_code in (401, 405), f"{path} should be blocked"
