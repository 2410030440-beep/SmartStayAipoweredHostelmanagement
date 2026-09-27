from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.student import StudentStatus


class StudentCreate(BaseModel):
    student_id: str = Field(min_length=1, max_length=50)
    full_name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=30)
    course: str = Field(min_length=2, max_length=150)
    year: str = Field(min_length=1, max_length=50)
    gender: str = Field(min_length=1, max_length=30)
    room_number: str | None = Field(default=None, max_length=30)
    status: StudentStatus = StudentStatus.ACTIVE


class StudentUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=150)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, min_length=7, max_length=30)
    course: str | None = Field(default=None, min_length=2, max_length=150)
    year: str | None = Field(default=None, min_length=1, max_length=50)
    gender: str | None = Field(default=None, min_length=1, max_length=30)
    room_number: str | None = Field(default=None, max_length=30)
    status: StudentStatus | None = None


class StudentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: str
    full_name: str
    email: EmailStr
    phone: str
    course: str
    year: str
    gender: str
    room_number: str | None
    status: StudentStatus
    created_at: datetime
    updated_at: datetime
