from datetime import datetime, timezone

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.announcement import Announcement, AnnouncementStatus, AnnouncementTarget
from app.models.student import Student
from app.models.user import User
from app.schemas.announcement import AnnouncementCreate, AnnouncementUpdate, validate_announcement_fields


def get_announcement(db: Session, announcement_id: int, for_update: bool = False) -> Announcement | None:
    query = select(Announcement).where(Announcement.id == announcement_id)
    if for_update:
        query = query.with_for_update()
    return db.scalar(query)


def normalize_block(value: str) -> str:
    return value.strip().removeprefix("Block ").strip().upper()


def validate_target_values(target, target_block, target_room, publish_at, expires_at, title, message) -> None:
    validate_announcement_fields(title, message, target, target_block, target_room, publish_at, expires_at)


def create_announcement(db: Session, admin: User, announcement_data: AnnouncementCreate) -> Announcement:
    target_block = normalize_block(announcement_data.target_block) if announcement_data.target_block else None
    announcement = Announcement(
        title=announcement_data.title.strip(),
        message=announcement_data.message.strip(),
        category=announcement_data.category,
        priority=announcement_data.priority,
        target=announcement_data.target,
        target_block=target_block,
        target_room=announcement_data.target_room.strip() if announcement_data.target_room else None,
        publish_at=announcement_data.publish_at,
        expires_at=announcement_data.expires_at,
        created_by=admin.id,
    )
    db.add(announcement)
    db.commit()
    db.refresh(announcement)
    return announcement


def list_announcements(db: Session, *, status_filter=None, category=None, priority=None, target=None) -> list[Announcement]:
    query = select(Announcement).order_by(Announcement.created_at.desc())
    if status_filter is not None:
        query = query.where(Announcement.status == status_filter)
    if category is not None:
        query = query.where(Announcement.category == category)
    if priority is not None:
        query = query.where(Announcement.priority == priority)
    if target is not None:
        query = query.where(Announcement.target == target)
    return list(db.scalars(query).all())


def list_my_announcements(db: Session, student: Student) -> list[Announcement]:
    now = datetime.now(timezone.utc)
    records = db.scalars(
        select(Announcement).where(
            Announcement.status == AnnouncementStatus.PUBLISHED,
            or_(Announcement.publish_at.is_(None), Announcement.publish_at <= now),
            or_(Announcement.expires_at.is_(None), Announcement.expires_at > now),
        ).order_by(Announcement.created_at.desc())
    ).all()
    student_block = normalize_block(student.room_number.split("-", 1)[0]) if student.room_number and "-" in student.room_number else None
    visible: list[Announcement] = []
    for announcement in records:
        if announcement.target == AnnouncementTarget.ALL_STUDENTS:
            visible.append(announcement)
        elif announcement.target == AnnouncementTarget.BLOCK and student_block == normalize_block(announcement.target_block or ""):
            visible.append(announcement)
        elif announcement.target == AnnouncementTarget.ROOM and student.room_number == announcement.target_room:
            visible.append(announcement)
    return visible


def update_announcement(db: Session, announcement: Announcement, update_data: AnnouncementUpdate) -> Announcement:
    if announcement.status == AnnouncementStatus.ARCHIVED:
        raise ValueError("Archived announcements cannot be updated")
    updates = update_data.model_dump(exclude_unset=True)
    target = updates.get("target", announcement.target)
    target_block = updates.get("target_block", announcement.target_block)
    target_room = updates.get("target_room", announcement.target_room)
    publish_at = updates.get("publish_at", announcement.publish_at)
    expires_at = updates.get("expires_at", announcement.expires_at)
    title = updates.get("title", announcement.title)
    message = updates.get("message", announcement.message)
    validate_target_values(target, target_block, target_room, publish_at, expires_at, title, message)
    if target == AnnouncementTarget.BLOCK:
        updates["target_block"] = normalize_block(target_block or "")
        updates["target_room"] = None
    elif target == AnnouncementTarget.ROOM:
        updates["target_room"] = (target_room or "").strip()
        updates["target_block"] = None
    else:
        updates["target_block"] = None
        updates["target_room"] = None
    if "title" in updates:
        updates["title"] = updates["title"].strip()
    if "message" in updates:
        updates["message"] = updates["message"].strip()
    for field, value in updates.items():
        setattr(announcement, field, value)
    db.commit()
    db.refresh(announcement)
    return announcement


def publish_announcement(db: Session, announcement: Announcement) -> Announcement:
    if announcement.status != AnnouncementStatus.DRAFT:
        raise ValueError("Only draft announcements can be published")
    announcement.status = AnnouncementStatus.PUBLISHED
    if announcement.publish_at is None:
        announcement.publish_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(announcement)
    return announcement


def archive_announcement(db: Session, announcement: Announcement) -> Announcement:
    if announcement.status == AnnouncementStatus.ARCHIVED:
        raise ValueError("Announcement is already archived")
    announcement.status = AnnouncementStatus.ARCHIVED
    db.commit()
    db.refresh(announcement)
    return announcement
