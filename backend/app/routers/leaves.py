from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_admin
from app.database.connection import get_db
from app.models.leave import LeaveRequest, LeaveStatus
from app.models.user import User, UserRole
from app.schemas.leave import LeaveCreate, LeaveDecision, LeaveResponse
from app.services.leave_service import (
    cancel_leave,
    create_leave,
    decide_leave,
    get_leave,
    get_student_for_user,
    list_leaves,
    list_my_leaves,
)

router = APIRouter(prefix="/api/leaves", tags=["Leaves"])


def leave_not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leave request not found")


def student_not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student record not found")


def require_student_record(db: Session, user: User):
    if user.role != UserRole.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student access is required")
    student = get_student_for_user(db, user)
    if student is None:
        raise student_not_found()
    return student


@router.post("", response_model=LeaveResponse, status_code=status.HTTP_201_CREATED)
def create_leave_request(
    leave_data: LeaveCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LeaveRequest:
    student = require_student_record(db, current_user)
    return create_leave(db, student, leave_data)


@router.get("/my", response_model=list[LeaveResponse])
def get_my_leaves(
    status_filter: LeaveStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[LeaveRequest]:
    student = require_student_record(db, current_user)
    return list_my_leaves(db, student.id, status_filter)


@router.get("", response_model=list[LeaveResponse])
def get_all_leaves(
    status_filter: LeaveStatus | None = Query(default=None, alias="status"),
    student_id: int | None = Query(default=None, gt=0),
    start_date: date | None = None,
    end_date: date | None = None,
    search: str | None = Query(default=None, max_length=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[LeaveRequest]:
    return list_leaves(
        db,
        status_filter=status_filter,
        student_id=student_id,
        start_date=start_date,
        end_date=end_date,
        search=search,
    )


@router.get("/{leave_id}", response_model=LeaveResponse)
def get_leave_detail(
    leave_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LeaveRequest:
    leave = get_leave(db, leave_id)
    if leave is None:
        raise leave_not_found()
    if current_user.role.value != "ADMIN":
        student = require_student_record(db, current_user)
        if leave.student_id != student.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only view your own leave requests")
    return leave


@router.post("/{leave_id}/cancel", response_model=LeaveResponse)
def cancel_leave_request(
    leave_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LeaveRequest:
    leave = get_leave(db, leave_id, for_update=True)
    if leave is None:
        raise leave_not_found()
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student access is required")
    student = require_student_record(db, current_user)
    if leave.student_id != student.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only cancel your own leave requests")
    try:
        return cancel_leave(db, leave)
    except ValueError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error


@router.put("/{leave_id}/decision", response_model=LeaveResponse)
def decide_leave_request(
    leave_id: int,
    decision: LeaveDecision,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> LeaveRequest:
    leave = get_leave(db, leave_id, for_update=True)
    if leave is None:
        raise leave_not_found()
    try:
        return decide_leave(db, leave, decision)
    except ValueError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error
