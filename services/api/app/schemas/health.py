"""Health profile request/response schemas."""

from datetime import date

from pydantic import BaseModel


class HealthProfileOut(BaseModel):
    profile_id: str
    conditions: list[str]
    conditions_other_text: str | None
    allergies: list[str]
    allergy_flag: str  # yes | no | unknown
    allergy_notes_text: str | None
    declared_confidence: str


class UpdateHealthProfileIn(BaseModel):
    conditions: list[str] | None = None
    conditions_other_text: str | None = None
    allergies: list[str] | None = None
    allergy_flag: str | None = None
    allergy_notes_text: str | None = None
    declared_confidence: str | None = None


class MedicationOut(BaseModel):
    medication_id: str
    name: str
    dose: str | None
    frequency: str | None
    start_date: date | None
    status: str
    data_source: str


class CreateMedicationIn(BaseModel):
    name: str
    dose: str | None = None
    frequency: str | None = None
    start_date: date | None = None


class HealthProfileResponse(BaseModel):
    profile: HealthProfileOut | None
    medications: list[MedicationOut]
