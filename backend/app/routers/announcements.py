from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_admin
from app.database.connection import get_db
from app.models.announcement import Announcement, AnnouncementCategory, AnnouncementPriority, AnnouncementStatus, AnnouncementTarget
from app.models.user import User, UserRole
from app.schemas.announcement import AnnouncementCreate, AnnouncementResponse, AnnouncementUpdate
from app.services.announcement_service import (
    archive_announcement,
    create_announcement,
    get_announcement,
    list_announcements,
    list_my_announcements,
    publish_announcement,
    update_announcement,
)
from app.services.student_service import get_student_by_email

router = APIRouter(prefix="/api/announcements", tags=["Announcements"])


def announcement_not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found")


@router.post("", response_model=AnnouncementResponse, status_code=status.HTTP_201_CREATED)
def create_announcement_record(
    announcement_data: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> Announcement:
    return create_announcement(db, current_user, announcement_data)


@router.get("/my", response_model=list[AnnouncementResponse])
def get_my_announcements(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Announcement]:
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student access is required")
    student = get_student_by_email(db, current_user.email)
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student record not found")
    return list_my_announcements(db, student)


@router.get("", response_model=list[AnnouncementResponse])
def get_all_announcements(
    status_filter: AnnouncementStatus | None = Query(default=None, alias="status"),
    category: AnnouncementCategory | None = None,
    priority: AnnouncementPriority | None = None,
    target: AnnouncementTarget | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[Announcement]:
    return list_announcements(db, status_filter=status_filter, category=category, priority=priority, target=target)


@router.get("/{announcement_id}", response_model=AnnouncementResponse)
def get_announcement_detail(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Announcement:
    announcement = get_announcement(db, announcement_id)
    if announcement is None:
        raise announcement_not_found()
    if current_user.role == UserRole.STUDENT:
        student = get_student_by_email(db, current_user.email)
        if student is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student record not found")
        if announcement_id not in {record.id for record in list_my_announcements(db, student)}:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot view this announcement")
    return announcement


@router.put("/{announcement_id}", response_model=AnnouncementResponse)
def update_announcement_record(
    announcement_id: int,
    update_data: AnnouncementUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> Announcement:
    announcement = get_announcement(db, announcement_id, for_update=True)
    if announcement is None:
        raise announcement_not_found()
    try:
        return update_announcement(db, announcement, update_data)
    except ValueError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error


@router.post("/{announcement_id}/publish", response_model=AnnouncementResponse)
def publish_announcement_record(
    announcement_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> Announcement:
    announcement = get_announcement(db, announcement_id, for_update=True)
    if announcement is None:
        raise announcement_not_found()
    try:
        return publish_announcement(db, announcement)
    except ValueError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error


@router.post("/{announcement_id}/archive", response_model=AnnouncementResponse)
def archive_announcement_record(
    announcement_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> Announcement:
    announcement = get_announcement(db, announcement_id, for_update=True)
    if announcement is None:
        raise announcement_not_found()
    try:
        return archive_announcement(db, announcement)
    except ValueError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error
