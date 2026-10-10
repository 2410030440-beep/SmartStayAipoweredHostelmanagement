from uuid import uuid4

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app.models.leave import LeaveRequest, LeaveStatus
from app.models.student import Student
from app.models.user import User
from app.schemas.leave import LeaveCreate, LeaveDecision


def get_student_for_user(db: Session, user: User) -> Student | None:
    return db.scalar(select(Student).where(Student.email == user.email.lower()))


def get_leave(db: Session, leave_id: int, for_update: bool = False) -> LeaveRequest | None:
    query = select(LeaveRequest).where(LeaveRequest.id == leave_id)
    if for_update:
        query = query.with_for_update()
    return db.scalar(query)


def generate_leave_number(db: Session) -> str:
    while True:
        leave_number = f"LV-{uuid4().hex[:12].upper()}"
        if db.scalar(select(LeaveRequest.id).where(LeaveRequest.leave_number == leave_number)) is None:
            return leave_number


def create_leave(db: Session, student: Student, leave_data: LeaveCreate) -> LeaveRequest:
    leave = LeaveRequest(
        leave_number=generate_leave_number(db),
        student_id=student.id,
        leave_type=leave_data.leave_type,
        start_date=leave_data.start_date,
        end_date=leave_data.end_date,
        reason=leave_data.reason.strip(),
    )
    db.add(leave)
    db.commit()
    db.refresh(leave)
    return leave


def list_my_leaves(db: Session, student_id: int, status_filter: LeaveStatus | None = None) -> list[LeaveRequest]:
    query = select(LeaveRequest).where(LeaveRequest.student_id == student_id).order_by(LeaveRequest.created_at.desc())
    if status_filter is not None:
        query = query.where(LeaveRequest.status == status_filter)
    return list(db.scalars(query).all())


def list_leaves(
    db: Session,
    *,
    status_filter: LeaveStatus | None = None,
    student_id: int | None = None,
    start_date=None,
    end_date=None,
    search: str | None = None,
) -> list[LeaveRequest]:
    query = select(LeaveRequest).join(Student, Student.id == LeaveRequest.student_id).order_by(LeaveRequest.created_at.desc())
    if status_filter is not None:
        query = query.where(LeaveRequest.status == status_filter)
    if student_id is not None:
        query = query.where(LeaveRequest.student_id == student_id)
    if start_date is not None:
        query = query.where(LeaveRequest.start_date >= start_date)
    if end_date is not None:
        query = query.where(LeaveRequest.end_date <= end_date)
    if search:
        search_term = f"%{search.strip()}%"
        query = query.where(or_(LeaveRequest.leave_number.ilike(search_term), Student.student_id.ilike(search_term), Student.full_name.ilike(search_term), Student.email.ilike(search_term)))
    return list(db.scalars(query).all())


def decide_leave(db: Session, leave: LeaveRequest, decision: LeaveDecision) -> LeaveRequest:
    if leave.status != LeaveStatus.PENDING:
        raise ValueError("Only pending leave requests can be approved or rejected")
    leave.status = decision.status
    leave.admin_note = decision.admin_note.strip() if decision.admin_note else None
    db.commit()
    db.refresh(leave)
    return leave


def cancel_leave(db: Session, leave: LeaveRequest) -> LeaveRequest:
    if leave.status != LeaveStatus.PENDING:
        raise ValueError("Only pending leave requests can be cancelled")
    leave.status = LeaveStatus.CANCELLED
    db.commit()
    db.refresh(leave)
    return leave
