import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, StaticPool
from sqlalchemy.orm import sessionmaker, Session

from app.main import app
from app.database import Base, get_db
from app.auth.jwt import hash_password
from app.models.user import User
from app.models.enums import UserRole

# Use SQLite in-memory for tests
SQLALCHEMY_TEST_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_TEST_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def student_user(db: Session) -> User:
    user = User(
        email="student@test.com",
        hashed_password=hash_password("testpass123"),
        full_name="Test Student",
        role=UserRole.student,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def company_user(db: Session) -> User:
    user = User(
        email="company@test.com",
        hashed_password=hash_password("testpass123"),
        full_name="Test Company",
        role=UserRole.company,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def admin_user(db: Session) -> User:
    user = User(
        email="admin@test.com",
        hashed_password=hash_password("testpass123"),
        full_name="Test Admin",
        role=UserRole.admin,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def student_token(client: TestClient, student_user: User) -> str:
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "student@test.com", "password": "testpass123"},
    )
    return response.json()["access_token"]


@pytest.fixture
def company_token(client: TestClient, company_user: User) -> str:
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "company@test.com", "password": "testpass123"},
    )
    return response.json()["access_token"]


@pytest.fixture
def admin_token(client: TestClient, admin_user: User) -> str:
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "admin@test.com", "password": "testpass123"},
    )
    return response.json()["access_token"]


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
