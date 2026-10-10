from datetime import date, datetime, time
import re

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.visitor import VisitorStatus


class VisitorCreate(BaseModel):
    visitor_name: str = Field(min_length=2, max_length=150)
    visitor_phone: str = Field(min_length=7, max_length=30)
    relationship: str = Field(min_length=1, max_length=80)
    purpose: str = Field(min_length=1, max_length=300)
    visit_date: date
    expected_entry_time: time
    expected_exit_time: time

    @field_validator("visitor_phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        cleaned = value.strip()
        if not re.fullmatch(r"[0-9+()\- .]{7,30}", cleaned):
            raise ValueError("visitor_phone contains invalid characters")
        return cleaned

    @model_validator(mode="after")
    def validate_times(self) -> "VisitorCreate":
        if not self.visitor_name.strip() or not self.relationship.strip() or not self.purpose.strip():
            raise ValueError("visitor details must not be empty")
        if self.expected_exit_time <= self.expected_entry_time:
            raise ValueError("expected_exit_time must be after expected_entry_time")
        return self


class VisitorDecision(BaseModel):
    status: VisitorStatus

    @model_validator(mode="after")
    def validate_decision(self) -> "VisitorDecision":
        if self.status not in {VisitorStatus.APPROVED, VisitorStatus.REJECTED}:
            raise ValueError("status must be APPROVED or REJECTED")
        return self


class VisitorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    visitor_number: str
    student_id: int
    visitor_name: str
    visitor_phone: str
    relationship: str
    purpose: str
    visit_date: date
    expected_entry_time: time
    expected_exit_time: time
    status: VisitorStatus
    check_in_at: datetime | None
    check_out_at: datetime | None
    created_at: datetime
    updated_at: datetime
