from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_admin
from app.database.connection import get_db
from app.models.complaint import Complaint, ComplaintStatus
from app.models.student import Student
from app.models.user import User, UserRole
from app.schemas.complaint import ComplaintCreate, ComplaintResponse, ComplaintUpdate
from app.services.complaint_service import (
    create_complaint,
    get_complaint,
    list_complaints,
    update_complaint,
)
from app.services.student_service import get_student_by_email

router = APIRouter(prefix="/api/complaints", tags=["Complaints"])


def complaint_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Complaint not found",
    )


def get_student_for_user(db: Session, current_user: User) -> Student:
    student = get_student_by_email(db, current_user.email)
    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student record not found for this account",
        )
    return student


@router.post("", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED)
def create_complaint_record(
    data: ComplaintCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Complaint:
    student = get_student_for_user(db, current_user)
    return create_complaint(db, student.id, student.room_number, data)


@router.get("/my", response_model=list[ComplaintResponse])
def get_my_complaints(
    complaint_status: ComplaintStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Complaint]:
    student = get_student_for_user(db, current_user)
    return list_complaints(db, student_id=student.id, status=complaint_status)


@router.get("", response_model=list[ComplaintResponse])
def get_all_complaints(
    complaint_status: ComplaintStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[Complaint]:
    return list_complaints(db, status=complaint_status)


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
        student = get_student_for_user(db, current_user)
        if complaint.student_id != student.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own complaints",
            )
    return complaint


@router.put("/{complaint_id}", response_model=ComplaintResponse)
def update_complaint_record(
    complaint_id: int,
    data: ComplaintUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> Complaint:
    complaint = get_complaint(db, complaint_id, for_update=True)
    if complaint is None:
        raise complaint_not_found()
    return update_complaint(db, complaint, data)
