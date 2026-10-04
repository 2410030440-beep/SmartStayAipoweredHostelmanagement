from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, Enum as SqlEnum, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class ComplaintCategory(str, Enum):
    MAINTENANCE = "MAINTENANCE"
    MESS = "MESS"
    ROOM = "ROOM"
    INTERNET = "INTERNET"
    SECURITY = "SECURITY"
    ACADEMIC = "ACADEMIC"
    HOSTEL = "HOSTEL"
    OTHER = "OTHER"


class ComplaintPriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


class ComplaintStatus(str, Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class Complaint(Base):
    __tablename__ = "complaints"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    complaint_number: Mapped[str] = mapped_column(
        String(30), unique=True, index=True, nullable=False
    )
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id"), index=True, nullable=False
    )
    room_number: Mapped[str | None] = mapped_column(String(30), nullable=True)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[ComplaintCategory] = mapped_column(
        SqlEnum(ComplaintCategory, name="complaint_category"),
        nullable=False,
    )
    priority: Mapped[ComplaintPriority] = mapped_column(
        SqlEnum(ComplaintPriority, name="complaint_priority"),
        default=ComplaintPriority.MEDIUM,
        nullable=False,
    )
    status: Mapped[ComplaintStatus] = mapped_column(
        SqlEnum(ComplaintStatus, name="complaint_status"),
        default=ComplaintStatus.OPEN,
        nullable=False,
    )
    admin_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
