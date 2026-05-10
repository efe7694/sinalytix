"""caregiver_v0 — CaregiverProfile + CaregiverShift extensions

Revision ID: b3f2a1c8d9e0
Revises: a79155ac1866
Create Date: 2026-05-02 10:00:00.000000

Changes:
- Create caregiver_profiles table
- Add new columns to caregiver_shifts (check_out_reason, shift_note,
  shift_note_structured, duration_minutes, timezone_iana, alert_24h_sent)
- Add partial unique index on caregiver_shifts (caregiver_id) WHERE shift_active = true
- Add new enum types: caregiver_role, caregiver_profile_status, check_out_reason
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "b3f2a1c8d9e0"
down_revision: Union[str, None] = "a79155ac1866"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── New enum types ────────────────────────────────────
    op.execute(
        "CREATE TYPE caregiver_role AS ENUM ('psw', 'hca', 'rpn', 'rn', 'other')"
    )
    op.execute(
        "CREATE TYPE caregiver_profile_status AS ENUM ('active', 'suspended', 'deactivated')"
    )
    op.execute(
        "CREATE TYPE check_out_reason AS ENUM ('manual', 'auto_switch', 'system_timeout')"
    )

    # ── caregiver_profiles ────────────────────────────────
    op.create_table(
        "caregiver_profiles",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("first_name", sa.String(length=50), nullable=False),
        sa.Column("last_name", sa.String(length=50), nullable=False),
        sa.Column(
            "phone",
            sa.String(length=50),
            nullable=True,
            comment="E.164; from OTP auth or V1 profile completion",
        ),
        sa.Column(
            "email",
            sa.String(length=255),
            nullable=True,
            comment="From SSO or V1 profile completion",
        ),
        sa.Column(
            "role",
            sa.Enum("psw", "hca", "rpn", "rn", "other", name="caregiver_role"),
            nullable=True,
            comment="V1: psw | rpn | rn | hca | other",
        ),
        sa.Column(
            "agency_id",
            sa.UUID(),
            nullable=True,
            comment="V1: populated after agency connection",
        ),
        sa.Column(
            "status",
            sa.Enum("active", "suspended", "deactivated", name="caregiver_profile_status"),
            nullable=False,
            server_default="active",
        ),
        sa.Column("onboarding_completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("user_id"),
    )

    # ── caregiver_shifts — add missing columns ────────────
    op.add_column(
        "caregiver_shifts",
        sa.Column(
            "check_out_reason",
            sa.Enum("manual", "auto_switch", "system_timeout", name="check_out_reason"),
            nullable=True,
        ),
    )
    op.add_column(
        "caregiver_shifts",
        sa.Column(
            "shift_note",
            sa.Text(),
            nullable=True,
            comment="Free-text checkout note, max 500 chars",
        ),
    )
    op.add_column(
        "caregiver_shifts",
        sa.Column(
            "shift_note_structured",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
            comment="V1: SBAR-inspired structured note",
        ),
    )
    op.add_column(
        "caregiver_shifts",
        sa.Column(
            "duration_minutes",
            sa.Integer(),
            nullable=True,
            comment="Set on checkout: (checked_out_at - checked_in_at) / 60",
        ),
    )
    op.add_column(
        "caregiver_shifts",
        sa.Column(
            "timezone_iana",
            sa.String(length=60),
            nullable=True,
            comment="Caregiver device timezone e.g. America/Toronto",
        ),
    )
    op.add_column(
        "caregiver_shifts",
        sa.Column(
            "alert_24h_sent",
            sa.Boolean(),
            nullable=False,
            server_default="false",
            comment="Whether 24h overrun alert was dispatched",
        ),
    )

    # ── Partial unique index — one active shift per caregiver ──
    op.execute(
        """
        CREATE UNIQUE INDEX uq_caregiver_shifts_active
        ON caregiver_shifts (caregiver_id)
        WHERE shift_active = true
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_caregiver_shifts_active")

    op.drop_column("caregiver_shifts", "alert_24h_sent")
    op.drop_column("caregiver_shifts", "timezone_iana")
    op.drop_column("caregiver_shifts", "duration_minutes")
    op.drop_column("caregiver_shifts", "shift_note_structured")
    op.drop_column("caregiver_shifts", "shift_note")
    op.drop_column("caregiver_shifts", "check_out_reason")

    op.drop_table("caregiver_profiles")

    op.execute("DROP TYPE IF EXISTS check_out_reason")
    op.execute("DROP TYPE IF EXISTS caregiver_profile_status")
    op.execute("DROP TYPE IF EXISTS caregiver_role")
