from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.attendance import AttendanceStatus


class AttendanceCreate(BaseModel):
    student_id: int = Field(gt=0)
    attendance_date: date
    status: AttendanceStatus


class AttendanceUpdate(BaseModel):
    attendance_date: date | None = None
    status: AttendanceStatus | None = None


class AttendanceBulkRecord(BaseModel):
    student_id: int = Field(gt=0)
    status: AttendanceStatus


class AttendanceBulkCreate(BaseModel):
    attendance_date: date
    records: list[AttendanceBulkRecord] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_unique_students(self) -> "AttendanceBulkCreate":
        student_ids = [record.student_id for record in self.records]
        if len(student_ids) != len(set(student_ids)):
            raise ValueError("Each student can appear only once in a bulk attendance request")
        return self


class AttendanceBulkResponse(BaseModel):
    attendance_date: date
    total_students: int
    present: int
    absent: int


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
