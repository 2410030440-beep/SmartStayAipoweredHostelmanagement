from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.complaint import (
    ComplaintCategory,
    ComplaintPriority,
    ComplaintStatus,
)


class ComplaintCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=5, max_length=5000)
    category: ComplaintCategory = ComplaintCategory.OTHER
    priority: ComplaintPriority = ComplaintPriority.MEDIUM

    @model_validator(mode="after")
    def validate_text(self) -> "ComplaintCreate":
        if not self.title.strip() or not self.description.strip():
            raise ValueError("title and description must not be empty")
        return self


class ComplaintUpdate(BaseModel):
    category: ComplaintCategory | None = None
    status: ComplaintStatus | None = None
    priority: ComplaintPriority | None = None
    admin_note: str | None = Field(default=None, max_length=5000)


class ComplaintResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    complaint_number: str
    student_id: int
    room_number: str | None
    title: str
    description: str
    category: ComplaintCategory
    priority: ComplaintPriority
    status: ComplaintStatus
    admin_note: str | None
    resolved_at: datetime | None
    created_at: datetime
    updated_at: datetime
