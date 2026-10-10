from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_admin
from app.database.connection import get_db
from app.models.user import User, UserRole
from app.models.visitor import Visitor, VisitorStatus
from app.schemas.visitor import VisitorCreate, VisitorDecision, VisitorResponse
from app.services.visitor_service import (
    cancel_visitor,
    check_in_visitor,
    check_out_visitor,
    create_visitor,
    decide_visitor,
    get_student_for_user,
    get_visitor,
    list_my_visitors,
    list_visitors,
)

router = APIRouter(prefix="/api/visitors", tags=["Visitors"])


def visitor_not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visitor request not found")


def student_not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student record not found")


def require_student_record(db: Session, user: User):
    if user.role != UserRole.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student access is required")
    student = get_student_for_user(db, user)
    if student is None:
        raise student_not_found()
    return student


@router.post("", response_model=VisitorResponse, status_code=status.HTTP_201_CREATED)
def create_visitor_request(
    visitor_data: VisitorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Visitor:
    student = require_student_record(db, current_user)
    return create_visitor(db, student, visitor_data)


@router.get("/my", response_model=list[VisitorResponse])
def get_my_visitors(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Visitor]:
    student = require_student_record(db, current_user)
    return list_my_visitors(db, student.id)


@router.get("", response_model=list[VisitorResponse])
def get_all_visitors(
    status_filter: VisitorStatus | None = Query(default=None, alias="status"),
    visit_date: date | None = None,
    student_id: int | None = Query(default=None, gt=0),
    search: str | None = Query(default=None, max_length=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[Visitor]:
    return list_visitors(db, status_filter=status_filter, visit_date=visit_date, student_id=student_id, search=search)


@router.get("/{visitor_id}", response_model=VisitorResponse)
def get_visitor_detail(
    visitor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Visitor:
    visitor = get_visitor(db, visitor_id)
    if visitor is None:
        raise visitor_not_found()
    if current_user.role.value != "ADMIN":
        student = require_student_record(db, current_user)
        if visitor.student_id != student.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only view your own visitor requests")
    return visitor


@router.post("/{visitor_id}/cancel", response_model=VisitorResponse)
def cancel_visitor_request(
    visitor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Visitor:
    visitor = get_visitor(db, visitor_id, for_update=True)
    if visitor is None:
        raise visitor_not_found()
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student access is required")
    student = require_student_record(db, current_user)
    if visitor.student_id != student.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only cancel your own visitor requests")
    try:
        return cancel_visitor(db, visitor)
    except ValueError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error


@router.put("/{visitor_id}/decision", response_model=VisitorResponse)
def decide_visitor_request(
    visitor_id: int,
    decision: VisitorDecision,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> Visitor:
    visitor = get_visitor(db, visitor_id, for_update=True)
    if visitor is None:
        raise visitor_not_found()
    try:
        return decide_visitor(db, visitor, decision)
    except ValueError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error


@router.post("/{visitor_id}/check-in", response_model=VisitorResponse)
def check_in_visitor_request(
    visitor_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> Visitor:
    visitor = get_visitor(db, visitor_id, for_update=True)
    if visitor is None:
        raise visitor_not_found()
    try:
        return check_in_visitor(db, visitor)
    except ValueError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error


@router.post("/{visitor_id}/check-out", response_model=VisitorResponse)
def check_out_visitor_request(
    visitor_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> Visitor:
    visitor = get_visitor(db, visitor_id, for_update=True)
    if visitor is None:
        raise visitor_not_found()
    try:
        return check_out_visitor(db, visitor)
    except ValueError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error
