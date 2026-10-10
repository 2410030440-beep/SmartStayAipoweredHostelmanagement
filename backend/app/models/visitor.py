from datetime import date, datetime, time
from enum import Enum

from sqlalchemy import Date, DateTime, Enum as SqlEnum, ForeignKey, String, Time, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class VisitorStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CHECKED_IN = "CHECKED_IN"
    CHECKED_OUT = "CHECKED_OUT"
    CANCELLED = "CANCELLED"


class Visitor(Base):
    __tablename__ = "visitors"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    visitor_number: Mapped[str] = mapped_column(String(40), unique=True, index=True, nullable=False)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), index=True, nullable=False)
    visitor_name: Mapped[str] = mapped_column(String(150), nullable=False)
    visitor_phone: Mapped[str] = mapped_column(String(30), nullable=False)
    relationship: Mapped[str] = mapped_column(String(80), nullable=False)
    purpose: Mapped[str] = mapped_column(String(300), nullable=False)
    visit_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    expected_entry_time: Mapped[time] = mapped_column(Time, nullable=False)
    expected_exit_time: Mapped[time] = mapped_column(Time, nullable=False)
    status: Mapped[VisitorStatus] = mapped_column(
        SqlEnum(VisitorStatus, name="visitor_status"), default=VisitorStatus.PENDING, nullable=False
    )
    check_in_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    check_out_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
