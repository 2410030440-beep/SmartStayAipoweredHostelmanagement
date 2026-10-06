from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.notification import NotificationType


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    message: str
    notification_type: NotificationType
    related_record_id: int | None
    is_read: bool
    created_at: datetime


class NotificationUnreadCount(BaseModel):
    unread_count: int
