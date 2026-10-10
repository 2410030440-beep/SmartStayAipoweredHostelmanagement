from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, Enum as SqlEnum, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class MaintenanceCategory(str, Enum):
    ELECTRICAL = "ELECTRICAL"
    PLUMBING = "PLUMBING"
    HVAC = "HVAC"
    INTERNET = "INTERNET"
    CLEANING = "CLEANING"
    FURNITURE = "FURNITURE"
    OTHER = "OTHER"


class MaintenancePriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


class MaintenanceStatus(str, Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class MaintenanceTicket(Base):
    __tablename__ = "maintenance_tickets"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    ticket_number: Mapped[str] = mapped_column(String(40), unique=True, index=True, nullable=False)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), index=True, nullable=False)
    room_number: Mapped[str | None] = mapped_column(String(30), index=True, nullable=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[MaintenanceCategory] = mapped_column(SqlEnum(MaintenanceCategory, name="maintenance_category"), nullable=False)
    priority: Mapped[MaintenancePriority] = mapped_column(SqlEnum(MaintenancePriority, name="maintenance_priority"), default=MaintenancePriority.MEDIUM, nullable=False)
    status: Mapped[MaintenanceStatus] = mapped_column(SqlEnum(MaintenanceStatus, name="maintenance_status"), default=MaintenanceStatus.OPEN, nullable=False)
    admin_note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
