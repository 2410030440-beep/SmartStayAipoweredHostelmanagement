from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, Enum as SqlEnum, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class AnnouncementCategory(str, Enum):
    GENERAL = "GENERAL"
    ACADEMIC = "ACADEMIC"
    HOSTEL = "HOSTEL"
    MAINTENANCE = "MAINTENANCE"
    MESS = "MESS"
    SECURITY = "SECURITY"
    EVENT = "EVENT"
    EMERGENCY = "EMERGENCY"


class AnnouncementPriority(str, Enum):
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    URGENT = "URGENT"


class AnnouncementTarget(str, Enum):
    ALL_STUDENTS = "ALL_STUDENTS"
    BLOCK = "BLOCK"
    ROOM = "ROOM"


class AnnouncementStatus(str, Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    ARCHIVED = "ARCHIVED"


class Announcement(Base):
    __tablename__ = "announcements"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[AnnouncementCategory] = mapped_column(
        SqlEnum(AnnouncementCategory, name="announcement_category"), nullable=False
    )
    priority: Mapped[AnnouncementPriority] = mapped_column(
        SqlEnum(AnnouncementPriority, name="announcement_priority"), default=AnnouncementPriority.NORMAL, nullable=False
    )
    target: Mapped[AnnouncementTarget] = mapped_column(
        SqlEnum(AnnouncementTarget, name="announcement_target"), nullable=False
    )
    target_block: Mapped[str | None] = mapped_column(String(50), nullable=True)
    target_room: Mapped[str | None] = mapped_column(String(30), nullable=True)
    status: Mapped[AnnouncementStatus] = mapped_column(
        SqlEnum(AnnouncementStatus, name="announcement_status"), default=AnnouncementStatus.DRAFT, nullable=False
    )
    publish_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
