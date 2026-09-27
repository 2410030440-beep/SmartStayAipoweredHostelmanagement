from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.attendance import AttendanceStatus


class AttendanceCreate(BaseModel):
    student_id: int = Field(gt=0)
    attendance_date: date
    status: AttendanceStatus


class AttendanceUpdate(BaseModel):
    attendance_date: date | None = None
    status: AttendanceStatus | None = None


class AttendanceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    attendance_date: date
    status: AttendanceStatus
    created_at: datetime
    updated_at: datetime


class AttendanceSummaryResponse(BaseModel):
    total_days: int
    present_days: int
    absent_days: int
    attendance_percentage: float
