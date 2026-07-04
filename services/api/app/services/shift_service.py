"""Shift management business logic.

Key invariants:
- At most 1 active shift per caregiver — enforced by DB partial unique index + this service
- auto_switch: checkout + checkin in single atomic transaction
- duration_minutes computed and written on checkout
- 24h alert: scheduled job calls mark_24h_alert_sent after sending push
"""

from datetime import UTC, datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.caregiver import CaregiverShift
from app.models.enums import CheckOutReason
from app.schemas.caregiver import (
    ShiftCheckInRequest,
    ShiftCheckOutRequest,
    ShiftHistoryItem,
    ShiftResponse,
)


class ShiftService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_active_shift(self, caregiver_id: str) -> ShiftResponse | None:
        result = await self.db.execute(
            select(CaregiverShift).where(
                CaregiverShift.caregiver_id == caregiver_id,
                CaregiverShift.shift_active.is_(True),
            )
        )
        shift = result.scalar_one_or_none()
        return self._to_response(shift) if shift else None

    async def check_in(self, caregiver_id: str, payload: ShiftCheckInRequest) -> ShiftResponse:
        # Guard: no concurrent active shift
        existing = await self.get_active_shift(caregiver_id)
        if existing:
            # 409 handled in router — caller should use /switch instead
            from fastapi import HTTPException, status

            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "SHIFT_ALREADY_ACTIVE",
                    "active_shift_id": existing.shift_id,
                    "active_patient_id": existing.patient_id,
                },
            )

        shift = CaregiverShift(
            caregiver_id=caregiver_id,
            patient_id=payload.patient_id,
            shift_active=True,
            checked_in_at=datetime.now(UTC),
            timezone_iana=payload.timezone_iana,
            alert_24h_sent=False,
        )
        self.db.add(shift)
        await self.db.commit()
        await self.db.refresh(shift)
        return self._to_response(shift)

    async def check_out(
        self, caregiver_id: str, payload: ShiftCheckOutRequest
    ) -> ShiftResponse | None:
        result = await self.db.execute(
            select(CaregiverShift).where(
                CaregiverShift.caregiver_id == caregiver_id,
                CaregiverShift.shift_active.is_(True),
            )
        )
        shift = result.scalar_one_or_none()
        if not shift:
            return None

        now = datetime.now(UTC)
        shift.shift_active = False
        shift.checked_out_at = now
        shift.check_out_reason = CheckOutReason.MANUAL
        shift.shift_note = payload.shift_note
        if shift.checked_in_at:
            delta = now - shift.checked_in_at
            shift.duration_minutes = int(delta.total_seconds() / 60)

        await self.db.commit()
        await self.db.refresh(shift)
        return self._to_response(shift)

    async def switch_patient(
        self, caregiver_id: str, payload: ShiftCheckInRequest
    ) -> ShiftResponse:
        """Atomically close active shift and open new one for a different patient."""
        now = datetime.now(UTC)

        # Close existing
        result = await self.db.execute(
            select(CaregiverShift).where(
                CaregiverShift.caregiver_id == caregiver_id,
                CaregiverShift.shift_active.is_(True),
            )
        )
        old_shift = result.scalar_one_or_none()
        if old_shift:
            old_shift.shift_active = False
            old_shift.checked_out_at = now
            old_shift.check_out_reason = CheckOutReason.AUTO_SWITCH
            if old_shift.checked_in_at:
                delta = now - old_shift.checked_in_at
                old_shift.duration_minutes = int(delta.total_seconds() / 60)

        # Open new
        new_shift = CaregiverShift(
            caregiver_id=caregiver_id,
            patient_id=payload.patient_id,
            shift_active=True,
            checked_in_at=now,
            timezone_iana=payload.timezone_iana,
            alert_24h_sent=False,
        )
        self.db.add(new_shift)
        await self.db.commit()
        await self.db.refresh(new_shift)
        return self._to_response(new_shift)

    async def get_history(
        self, caregiver_id: str, limit: int = 30, offset: int = 0
    ) -> list[ShiftHistoryItem]:
        result = await self.db.execute(
            select(CaregiverShift)
            .where(
                CaregiverShift.caregiver_id == caregiver_id,
                CaregiverShift.shift_active.is_(False),
            )
            .order_by(CaregiverShift.checked_in_at.desc())
            .limit(limit)
            .offset(offset)
        )
        shifts = result.scalars().all()

        items = []
        for s in shifts:
            items.append(
                ShiftHistoryItem(
                    shift_id=str(s.id),
                    patient_id=str(s.patient_id),
                    patient_name="",  # enriched by caller or join
                    checked_in_at=s.checked_in_at,
                    checked_out_at=s.checked_out_at,
                    duration_minutes=s.duration_minutes,
                    shift_note=s.shift_note,
                )
            )
        return items

    async def mark_24h_alert_sent(self, shift_id: str) -> None:
        await self.db.execute(
            update(CaregiverShift).where(CaregiverShift.id == shift_id).values(alert_24h_sent=True)
        )
        await self.db.commit()

    @staticmethod
    def _to_response(shift: CaregiverShift) -> ShiftResponse:
        from app.schemas.caregiver import ShiftResponse

        return ShiftResponse(
            shift_id=str(shift.id),
            caregiver_id=str(shift.caregiver_id),
            patient_id=str(shift.patient_id),
            shift_active=shift.shift_active,
            checked_in_at=shift.checked_in_at,
            checked_out_at=shift.checked_out_at,
            check_out_reason=shift.check_out_reason,
            shift_note=shift.shift_note,
            duration_minutes=shift.duration_minutes,
            timezone_iana=shift.timezone_iana,
            alert_24h_sent=shift.alert_24h_sent,
        )
