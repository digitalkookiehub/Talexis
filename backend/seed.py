"""Seed script to populate the database with demo data for testing."""
import logging
import sys
import uuid
from datetime import datetime, timezone

from app.database import SessionLocal
from app.auth.jwt import hash_password
from app.models.user import User
from app.models.student import StudentProfile
from app.models.company import Company
from app.models.talent_profile import TalentProfile
from app.models.learning import LearningModule
from app.models.enums import UserRole, LearningCategory, Recommendation

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def seed():
    db = SessionLocal()
    try:
        # Check if already seeded
        if db.query(User).filter(User.email == "student@demo.com").first():
            logger.info("Database already seeded, skipping.")
            return

        # --- Users ---
        students_data = [
            ("student@demo.com", "Arjun Kumar", "Computer Science", "Engineering", "IIT Madras", 2025,
             ["Python", "React", "Machine Learning", "SQL"], 72.5),
            ("priya@demo.com", "Priya Sharma", "Information Technology", "Engineering", "NIT Trichy", 2025,
             ["Java", "Spring Boot", "AWS", "Docker"], 68.0),
            ("rahul@demo.com", "Rahul Verma", "Electronics", "Engineering", "VIT Vellore", 2026,
             ["C++", "Embedded Systems", "IoT", "Python"], 55.3),
        ]

        student_users = []
        for email, name, branch, dept, college, year, skills, score in students_data:
            user = User(email=email, hashed_password=hash_password("demo1234"), full_name=name, role=UserRole.student, is_active=True, is_verified=True)
            db.add(user)
            db.flush()

            profile = StudentProfile(
                user_id=user.id, branch=branch, department=dept, college_name=college,
                graduation_year=year, skills=skills, interests=["AI", "Web Development"],
                bio=f"{name} is a passionate {branch} student at {college}.",
                baseline_score=score,
            )
            db.add(profile)
            db.flush()

            # Create talent profile with consent
            talent = TalentProfile(
                student_id=profile.id,
                candidate_code=f"TAL-{uuid.uuid4().hex[:8].upper()}",
                is_visible=True, consent_given=True,
                consent_date=datetime.now(timezone.utc),
                skill_scores={"communication": score * 0.1, "technical": score * 0.11, "confidence": score * 0.09, "structure": score * 0.1},
                recommendation=Recommendation.yes if score >= 70 else (Recommendation.maybe if score >= 55 else Recommendation.no),
            )
            db.add(talent)
            student_users.append(user)

        # Company users
        company_user = User(email="company@demo.com", hashed_password=hash_password("demo1234"), full_name="TechCorp HR", role=UserRole.company, is_active=True, is_verified=True)
        db.add(company_user)
        db.flush()

        company = Company(user_id=company_user.id, company_name="TechCorp India", industry="Technology", size="100-500", website="https://techcorp.example.com", description="Leading tech company hiring fresh talent.")
        db.add(company)

        company_user2 = User(email="hr@startup.com", hashed_password=hash_password("demo1234"), full_name="Startup Recruiter", role=UserRole.company, is_active=True, is_verified=True)
        db.add(company_user2)
        db.flush()
        db.add(Company(user_id=company_user2.id, company_name="InnoStart", industry="SaaS", size="10-50", description="Fast-growing SaaS startup."))

        # Admin user
        admin = User(email="admin@talexis.com", hashed_password=hash_password("admin1234"), full_name="Platform Admin", role=UserRole.admin, is_active=True, is_verified=True)
        db.add(admin)

        # College admin
        college_admin = User(email="placement@college.com", hashed_password=hash_password("demo1234"), full_name="Placement Officer", role=UserRole.college_admin, is_active=True, is_verified=True)
        db.add(college_admin)

        # --- Learning Modules ---
        modules = [
            ("STAR Method Mastery", LearningCategory.hr, "basic", 15,
             "Learn the STAR (Situation, Task, Action, Result) method to structure behavioral answers.\n\n1. Situation: Set the scene\n2. Task: Describe your responsibility\n3. Action: Explain what you did\n4. Result: Share the outcome with metrics",
             ["interview", "behavioral", "structure"]),
            ("Communication Clarity", LearningCategory.communication, "basic", 10,
             "Tips for clear communication in interviews:\n\n- Pause before answering\n- Use simple language\n- Avoid filler words (um, like)\n- Summarize your key point at the end",
             ["communication", "soft-skills"]),
            ("Technical Interview Prep", LearningCategory.technical, "intermediate", 20,
             "How to approach technical questions:\n\n1. Clarify the problem\n2. Think out loud\n3. Start with brute force\n4. Optimize step by step\n5. Test with edge cases",
             ["technical", "coding", "problem-solving"]),
            ("Building Confidence", LearningCategory.behavioral, "basic", 12,
             "Strategies to project confidence:\n\n- Practice power posing before interviews\n- Prepare 5 strong stories from your experience\n- Record yourself and review\n- Focus on what you know, not what you don't",
             ["confidence", "mindset", "preparation"]),
            ("HR Interview Basics", LearningCategory.hr, "basic", 15,
             "Common HR questions and how to answer them:\n\n- Tell me about yourself (2-min pitch)\n- Why this company? (research-based)\n- Strengths and weaknesses (honest + growth)\n- Where do you see yourself in 5 years?",
             ["hr", "common-questions", "basics"]),
            ("Advanced Data Structures", LearningCategory.technical, "advanced", 30,
             "Deep dive into advanced DS:\n\n- Segment Trees\n- Tries and suffix arrays\n- Graph algorithms (Dijkstra, Floyd-Warshall)\n- Dynamic programming patterns",
             ["technical", "dsa", "advanced"]),
        ]

        for title, category, difficulty, duration, content, tags in modules:
            db.add(LearningModule(title=title, category=category, difficulty=difficulty, duration_minutes=duration, content_text=content, tags=tags))

        db.commit()
        logger.info("Seed data created successfully!")
        logger.info("")
        logger.info("Demo accounts:")
        logger.info("  Student:  student@demo.com / demo1234")
        logger.info("  Student:  priya@demo.com / demo1234")
        logger.info("  Student:  rahul@demo.com / demo1234")
        logger.info("  Company:  company@demo.com / demo1234")
        logger.info("  Company:  hr@startup.com / demo1234")
        logger.info("  Admin:    admin@talexis.com / admin1234")
        logger.info("  College:  placement@college.com / demo1234")

    except Exception as e:
        db.rollback()
        logger.error("Seed failed: %s", str(e))
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
