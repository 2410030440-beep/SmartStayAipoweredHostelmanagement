from datetime import date, datetime
from enum import Enum

from sqlalchemy import CheckConstraint, Date, DateTime, Enum as SqlEnum, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class MealType(str, Enum):
    BREAKFAST = "BREAKFAST"
    LUNCH = "LUNCH"
    SNACKS = "SNACKS"
    DINNER = "DINNER"


class MessMenuStatus(str, Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    ARCHIVED = "ARCHIVED"


class MessMenu(Base):
    __tablename__ = "mess_menus"
    __table_args__ = (UniqueConstraint("menu_date", "meal_type", name="uq_mess_menu_date_meal"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    menu_date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    meal_type: Mapped[MealType] = mapped_column(SqlEnum(MealType, name="meal_type"), nullable=False)
    items: Mapped[str] = mapped_column(Text, nullable=False)
    special_note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[MessMenuStatus] = mapped_column(SqlEnum(MessMenuStatus, name="mess_menu_status"), default=MessMenuStatus.DRAFT, nullable=False)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class MessFeedback(Base):
    __tablename__ = "mess_feedback"
    __table_args__ = (
        CheckConstraint("rating BETWEEN 1 AND 5", name="ck_mess_feedback_rating"),
        {"extend_existing": True},
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), index=True, nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    feedback: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
