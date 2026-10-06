import logging
from collections.abc import Iterable

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.core.notification_manager import notification_manager
from app.models.notification import Notification, NotificationType
from app.models.student import Student
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)


def _payload(notification: Notification) -> dict[str, object]:
    return {
        "event": "notification.created",
        "notification": {
            "id": notification.id,
            "title": notification.title,
            "message": notification.message,
            "notification_type": notification.notification_type.value,
            "related_record_id": notification.related_record_id,
            "is_read": notification.is_read,
            "created_at": notification.created_at.isoformat() if notification.created_at else None,
        },
    }


def create_notification(
    db: Session,
    *,
    recipient_user_id: int,
    title: str,
    message: str,
    notification_type: NotificationType,
    event_key: str,
    related_record_id: int | None = None,
) -> Notification:
    existing = db.scalar(select(Notification).where(Notification.event_key == event_key))
    if existing is not None:
        return existing
    notification = Notification(
        recipient_user_id=recipient_user_id,
        title=title,
        message=message,
        notification_type=notification_type,
        related_record_id=related_record_id,
        event_key=event_key,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    notification_manager.publish(recipient_user_id, _payload(notification))
    return notification


def create_notifications(
    db: Session,
    *,
    recipient_user_ids: Iterable[int],
    title: str,
    message: str,
    notification_type: NotificationType,
    event_key: str,
    related_record_id: int | None = None,
) -> list[Notification]:
    notifications: list[Notification] = []
    for user_id in dict.fromkeys(recipient_user_ids):
        notifications.append(
            create_notification(
                db,
                recipient_user_id=user_id,
                title=title,
                message=message,
                notification_type=notification_type,
                event_key=f"{event_key}:user:{user_id}",
                related_record_id=related_record_id,
            )
        )
    return notifications


def admin_user_ids(db: Session) -> list[int]:
    return list(db.scalars(select(User.id).where(User.role == UserRole.ADMIN)).all())


def student_user_id(db: Session, student_id: int) -> int | None:
    return db.scalar(
        select(User.id).join(Student, Student.email == User.email).where(
            Student.id == student_id,
            User.role == UserRole.STUDENT,
        )
    )


def student_user_ids_for_target(db: Session, target: str, target_block: str | None, target_room: str | None) -> list[int]:
    query = select(User.id).join(Student, Student.email == User.email).where(User.role == UserRole.STUDENT)
    if target == "BLOCK":
        query = query.where(Student.room_number.ilike(f"{target_block}-%"))
    elif target == "ROOM":
        query = query.where(Student.room_number == target_room)
    return list(db.scalars(query).all())


def list_notifications(db: Session, user_id: int, limit: int = 100) -> list[Notification]:
    return list(
        db.scalars(
            select(Notification)
            .where(Notification.recipient_user_id == user_id)
            .order_by(Notification.created_at.desc(), Notification.id.desc())
            .limit(limit)
        ).all()
    )


def unread_count(db: Session, user_id: int) -> int:
    return int(
        db.scalar(
            select(func.count(Notification.id)).where(
                Notification.recipient_user_id == user_id,
                Notification.is_read.is_(False),
            )
        )
        or 0
    )


def mark_read(db: Session, user_id: int, notification_id: int) -> Notification | None:
    notification = db.scalar(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.recipient_user_id == user_id,
        )
    )
    if notification is None:
        return None
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification


def mark_all_read(db: Session, user_id: int) -> int:
    result = db.execute(
        update(Notification)
        .where(Notification.recipient_user_id == user_id, Notification.is_read.is_(False))
        .values(is_read=True)
    )
    db.commit()
    return int(result.rowcount or 0)


def emit_notifications(db: Session, **kwargs: object) -> None:
    try:
        create_notifications(db, **kwargs)  # type: ignore[arg-type]
    except Exception:
        db.rollback()
        logger.exception("Notification persistence failed after a successful business operation")
