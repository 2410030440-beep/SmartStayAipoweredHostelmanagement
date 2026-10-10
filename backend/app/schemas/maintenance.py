from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.maintenance import MaintenanceCategory, MaintenancePriority, MaintenanceStatus


class MaintenanceCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1)
    category: MaintenanceCategory
    priority: MaintenancePriority = MaintenancePriority.MEDIUM

    @model_validator(mode="after")
    def validate_text(self) -> "MaintenanceCreate":
        if not self.title.strip() or not self.description.strip():
            raise ValueError("title and description must not be empty")
        return self


class MaintenanceUpdate(BaseModel):
    category: MaintenanceCategory | None = None
    priority: MaintenancePriority | None = None
    status: MaintenanceStatus | None = None
    admin_note: str | None = Field(default=None, max_length=500)


class MaintenanceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ticket_number: str
    student_id: int
    room_number: str | None
    title: str
    description: str
    category: MaintenanceCategory
    priority: MaintenancePriority
    status: MaintenanceStatus
    admin_note: str | None
    resolved_at: datetime | None
    created_at: datetime
    updated_at: datetime
