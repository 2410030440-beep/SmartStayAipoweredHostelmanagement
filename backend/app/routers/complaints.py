from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_admin
from app.database.connection import get_db
from app.models.complaint import Complaint, ComplaintCategory, ComplaintPriority, ComplaintStatus
from app.models.notification import NotificationType
from app.models.student import Student
from app.models.user import User, UserRole
from app.schemas.complaint import ComplaintCreate, ComplaintResponse, ComplaintUpdate
from app.services.complaint_service import (
    create_complaint,
    delete_complaint,
    get_complaint,
    get_student_for_user,
    list_complaints,
    list_my_complaints,
    update_complaint,
)
from app.services.notification_service import admin_user_ids, emit_notifications

router = APIRouter(prefix="/api/complaints", tags=["Complaints"])


def complaint_not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")


def require_student_record(db: Session, user: User) -> Student:
    if user.role != UserRole.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student access is required")
    student = get_student_for_user(db, user)
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student record not found")
    return student


@router.post("", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED)
def create_complaint_record(
    complaint_data: ComplaintCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Complaint:
    student = require_student_record(db, current_user)
    complaint = create_complaint(db, student, complaint_data)
    emit_notifications(
        db,
        recipient_user_ids=admin_user_ids(db),
        title="New complaint submitted",
        message=f"{student.full_name} submitted complaint {complaint.complaint_number}: {complaint.title}.",
        notification_type=NotificationType.COMPLAINT,
        event_key=f"complaint:created:{complaint.id}",
        related_record_id=complaint.id,
    )
    return complaint


@router.get("/my", response_model=list[ComplaintResponse])
def get_my_complaints(
    complaint_status: ComplaintStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Complaint]:
    student = require_student_record(db, current_user)
    if complaint_status is None:
        return list_my_complaints(db, student.id)
    return list_complaints(db, student_id=student.id, status=complaint_status)


@router.get("", response_model=list[ComplaintResponse])
def get_all_complaints(
    status_filter: ComplaintStatus | None = Query(default=None, alias="status"),
    category: ComplaintCategory | None = None,
    priority: ComplaintPriority | None = None,
    room_number: str | None = None,
    student_id: int | None = Query(default=None, gt=0),
    search: str | None = Query(default=None, max_length=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[Complaint]:
    return list_complaints(
        db,
        status=status_filter,
        category=category,
        priority=priority,
        room_number=room_number,
        student_id=student_id,
        search=search,
    )


@router.get("/{complaint_id}", response_model=ComplaintResponse)
def get_complaint_detail(
    complaint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Complaint:
    complaint = get_complaint(db, complaint_id)
    if complaint is None:
        raise complaint_not_found()
    if current_user.role != UserRole.ADMIN:
        student = require_student_record(db, current_user)
        if complaint.student_id != student.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only view your own complaints")
    return complaint


@router.put("/{complaint_id}", response_model=ComplaintResponse)
@router.patch("/{complaint_id}", response_model=ComplaintResponse)
def update_complaint_record(
    complaint_id: int,
    update_data: ComplaintUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> Complaint:
    complaint = get_complaint(db, complaint_id, for_update=True)
    if complaint is None:
        raise complaint_not_found()
    try:
        return update_complaint(db, complaint, update_data)
    except ValueError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error


@router.delete("/{complaint_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_complaint_record(
    complaint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    complaint = get_complaint(db, complaint_id, for_update=True)
    if complaint is None:
        raise complaint_not_found()
    student = require_student_record(db, current_user)
    if complaint.student_id != student.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only delete your own complaints")
    delete_complaint(db, complaint)
