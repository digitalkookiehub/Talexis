"""add interview_id and question_id to token_usage

Revision ID: 92e9cef2b9aa
Revises: d50b88aedcdd
Create Date: 2026-04-20
"""
from alembic import op
import sqlalchemy as sa

revision = "92e9cef2b9aa"
down_revision = "d50b88aedcdd"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("token_usage", sa.Column("interview_id", sa.Integer(), nullable=True))
    op.add_column("token_usage", sa.Column("question_id", sa.Integer(), nullable=True))
    op.create_index("ix_token_usage_interview_id", "token_usage", ["interview_id"])
    op.create_foreign_key(
        "fk_token_usage_interview_id", "token_usage", "interviews",
        ["interview_id"], ["id"], ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_token_usage_interview_id", "token_usage", type_="foreignkey")
    op.drop_index("ix_token_usage_interview_id", "token_usage")
    op.drop_column("token_usage", "question_id")
    op.drop_column("token_usage", "interview_id")
