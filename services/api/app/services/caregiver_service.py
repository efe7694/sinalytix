"""Business logic for caregiver profile and patient linking."""

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.caregiver import CaregiverLink, CaregiverProfile
from app.models.consent import ConsentRecord
from app.models.enums import CaregiverLinkStatus, CaregiverProfileStatus
from app.models.user import User
from app.schemas.caregiver import (
    CaregiverOnboardingCompleteRequest,
    CaregiverProfileResponse,
    LinkedPatientSummary,
)


class CaregiverService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def complete_onboarding(
        self,
        user_id: str,
        payload: CaregiverOnboardingCompleteRequest,
    ) -> CaregiverProfileResponse:
        """Idempotent: create or update caregiver profile + consent record."""
        # Upsert profile
        result = await self.db.execute(
            select(CaregiverProfile).where(CaregiverProfile.user_id == user_id)
        )
        profile = result.scalar_one_or_none()

        if profile is None:
            profile = CaregiverProfile(
                user_id=user_id,
                first_name=payload.first_name,
                last_name=payload.last_name,
                phone=payload.phone,
                email=payload.email,
                status=CaregiverProfileStatus.ACTIVE,
                onboarding_completed_at=datetime.now(UTC),
            )
            self.db.add(profile)
        else:
            profile.first_name = payload.first_name
            profile.last_name = payload.last_name
            if payload.phone:
                profile.phone = payload.phone
            if payload.email:
                profile.email = payload.email
            if not profile.onboarding_completed_at:
                profile.onboarding_completed_at = datetime.now(UTC)

        # Write consent record (immutable insert-only)
        consent = ConsentRecord(
            user_id=user_id,
            version=payload.tos_version,
            flags={
                "accept_tos": payload.consent.get("accept_tos", False),
                "accept_privacy": payload.consent.get("accept_privacy", False),
                "ack_not_emergency": payload.consent.get("ack_not_emergency", False),
                "ack_no_clinical_decision": payload.consent.get("ack_no_clinical_decision", False),
            },
        )
        self.db.add(consent)

        # Update user locale
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user:
            user.locale = payload.language

        await self.db.commit()
        await self.db.refresh(profile)
        return profile

    async def get_profile(self, user_id: str) -> CaregiverProfile | None:
        result = await self.db.execute(
            select(CaregiverProfile).where(CaregiverProfile.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def list_linked_patients(self, caregiver_id: str) -> list[LinkedPatientSummary]:
        result = await self.db.execute(
            select(CaregiverLink).where(
                CaregiverLink.caregiver_id == caregiver_id,
                CaregiverLink.status == CaregiverLinkStatus.LINKED,
            )
        )
        links = result.scalars().all()

        summaries = []
        for link in links:
            # Fetch patient basic info
            patient_result = await self.db.execute(select(User).where(User.id == link.patient_id))
            patient = patient_result.scalar_one_or_none()
            if not patient:
                continue

            summaries.append(
                LinkedPatientSummary(
                    patient_id=str(link.patient_id),
                    first_name=getattr(patient, "first_name", ""),
                    last_name=getattr(patient, "last_name", ""),
                    primary_condition=None,
                    link_id=str(link.id),
                    linked_at=link.linked_at or link.created_at,
                )
            )
        return summaries

    async def link_patient(self, caregiver_id: str, link_code: str) -> dict:
        result = await self.db.execute(
            select(CaregiverLink).where(
                CaregiverLink.link_code == link_code.upper(),
                CaregiverLink.status == CaregiverLinkStatus.PENDING,
            )
        )
        link = result.scalar_one_or_none()

        if not link:
            raise ValueError("Invalid or expired link code")

        now = datetime.now(UTC)
        if link.expires_at < now:
            link.status = CaregiverLinkStatus.EXPIRED
            await self.db.commit()
            raise ValueError("Link code has expired")

        link.caregiver_id = caregiver_id
        link.status = CaregiverLinkStatus.LINKED
        link.linked_at = now
        await self.db.commit()

        return {"linked": True, "patient_id": str(link.patient_id)}
