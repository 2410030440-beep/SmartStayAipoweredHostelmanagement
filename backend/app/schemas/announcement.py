from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.announcement import (
    AnnouncementCategory,
    AnnouncementPriority,
    AnnouncementStatus,
    AnnouncementTarget,
)


class AnnouncementCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    message: str = Field(min_length=1)
    category: AnnouncementCategory
    priority: AnnouncementPriority = AnnouncementPriority.NORMAL
    target: AnnouncementTarget
    target_block: str | None = Field(default=None, max_length=50)
    target_room: str | None = Field(default=None, max_length=30)
    publish_at: datetime | None = None
    expires_at: datetime | None = None

    @model_validator(mode="after")
    def validate_announcement(self) -> "AnnouncementCreate":
        validate_announcement_fields(
            self.title, self.message, self.target, self.target_block, self.target_room, self.publish_at, self.expires_at
        )
        return self


class AnnouncementUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    message: str | None = Field(default=None, min_length=1)
    category: AnnouncementCategory | None = None
    priority: AnnouncementPriority | None = None
    target: AnnouncementTarget | None = None
    target_block: str | None = Field(default=None, max_length=50)
    target_room: str | None = Field(default=None, max_length=30)
    publish_at: datetime | None = None
    expires_at: datetime | None = None

    @model_validator(mode="after")
    def validate_dates(self) -> "AnnouncementUpdate":
        if self.publish_at is not None and self.expires_at is not None and self.expires_at <= self.publish_at:
            raise ValueError("expires_at must be after publish_at")
        return self


class AnnouncementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    message: str
    category: AnnouncementCategory
    priority: AnnouncementPriority
    target: AnnouncementTarget
    target_block: str | None
    target_room: str | None
    status: AnnouncementStatus
    publish_at: datetime | None
    expires_at: datetime | None
    created_by: int
    created_at: datetime
    updated_at: datetime


def validate_announcement_fields(
    title: str,
    message: str,
    target: AnnouncementTarget,
    target_block: str | None,
    target_room: str | None,
    publish_at: datetime | None,
    expires_at: datetime | None,
) -> None:
    if not title.strip() or not message.strip():
        raise ValueError("title and message must not be empty")
    if target == AnnouncementTarget.ALL_STUDENTS and (target_block or target_room):
        raise ValueError("target_block and target_room must be empty for ALL_STUDENTS")
    if target == AnnouncementTarget.BLOCK and (not target_block or target_room):
        raise ValueError("BLOCK announcements require target_block only")
    if target == AnnouncementTarget.ROOM and (not target_room or target_block):
        raise ValueError("ROOM announcements require target_room only")
    if publish_at is not None and expires_at is not None and expires_at <= publish_at:
        raise ValueError("expires_at must be after publish_at")
