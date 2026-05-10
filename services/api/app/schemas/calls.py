"""Call request/response schemas."""

from datetime import datetime

from pydantic import BaseModel


class LogCallIn(BaseModel):
    call_type: str  # sos | regular
    target_type: str  # family | caregiver | emergency_services
    target_id: str | None = None
    status: str  # initiated | cancelled | completed
    cancel_stage: str | None = None
    initiated_at: datetime
    ended_at: datetime | None = None


class CallAttemptOut(BaseModel):
    id: str
    call_type: str
    target_type: str
    target_id: str | None
    status: str
    cancel_stage: str | None
    initiated_at: datetime


class AvailabilityOut(BaseModel):
    caregiver_available: bool
    caregiver_phone: str | None
    caregiver_name: str | None
    family_available: bool
    family_phone: str | None
    family_name: str | None
    ec_primary: dict | None  # {ec_id, phone, name} | null
