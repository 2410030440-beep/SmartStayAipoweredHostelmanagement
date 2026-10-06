from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, Enum as SqlEnum, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class NotificationType(str, Enum):
    LEAVE = "LEAVE"
    VISITOR = "VISITOR"
    COMPLAINT = "COMPLAINT"
    ANNOUNCEMENT = "ANNOUNCEMENT"
    ROOM = "ROOM"
    PAYMENT = "PAYMENT"
    SYSTEM = "SYSTEM"


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (UniqueConstraint("event_key", name="uq_notification_event_key"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    recipient_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    notification_type: Mapped[NotificationType] = mapped_column(
        SqlEnum(NotificationType, name="notification_type"), nullable=False
    )
    related_record_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    event_key: Mapped[str] = mapped_column(String(180), nullable=False)
    is_read: Mapped[bool] = mapped_column(default=False, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
