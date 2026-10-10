from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.leave import LeaveStatus, LeaveType


class LeaveCreate(BaseModel):
    leave_type: LeaveType
    start_date: date
    end_date: date
    reason: str = Field(min_length=1, max_length=500)

    @model_validator(mode="after")
    def validate_dates(self) -> "LeaveCreate":
        if self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        if not self.reason.strip():
            raise ValueError("reason must not be empty")
        return self


class LeaveDecision(BaseModel):
    status: LeaveStatus
    admin_note: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def validate_decision(self) -> "LeaveDecision":
        if self.status not in {LeaveStatus.APPROVED, LeaveStatus.REJECTED}:
            raise ValueError("status must be APPROVED or REJECTED")
        return self


class LeaveResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    leave_number: str
    student_id: int
    leave_type: LeaveType
    start_date: date
    end_date: date
    reason: str
    status: LeaveStatus
    admin_note: str | None
    created_at: datetime
    updated_at: datetime
