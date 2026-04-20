from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

from app.config import settings
from app.database import Base

# Import all models so Alembic can detect them
from app.models import (  # noqa: F401
    User, RefreshToken, StudentProfile, SkillAssessment,
    Company, JobRole, Interview, InterviewQuestion,
    InterviewAnswer, InterviewAttempt, AnswerEvaluation,
    EvaluationRun, PlacementReadiness, ReadinessHistory,
    TalentProfile, CompanyShortlist, MatchResult,
    LearningModule, StudentLearningProgress,
    AntiCheatLog, AnswerSimilarity,
)
from app.models.scheduled_interview import ScheduledInterview  # noqa: F401
from app.models.college_recommendation import CollegeRecommendation  # noqa: F401
from app.models.activity_log import ActivityLog  # noqa: F401
from app.models.demo_request import DemoRequest  # noqa: F401
from app.models.job_application import JobApplication  # noqa: F401
from app.models.subscription import UserSubscription  # noqa: F401
from app.models.tracking import TokenUsage, UserActivity, ApiMetric  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# Override sqlalchemy.url with the env var
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
