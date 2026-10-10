from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.student import Student
from app.models.user import User
from app.models.visitor import Visitor, VisitorStatus
from app.schemas.visitor import VisitorCreate, VisitorDecision


def get_student_for_user(db: Session, user: User) -> Student | None:
    return db.scalar(select(Student).where(Student.email == user.email.lower()))


def get_visitor(db: Session, visitor_id: int, for_update: bool = False) -> Visitor | None:
    query = select(Visitor).where(Visitor.id == visitor_id)
    if for_update:
        query = query.with_for_update()
    return db.scalar(query)


def generate_visitor_number(db: Session) -> str:
    while True:
        visitor_number = f"VIS-{uuid4().hex[:12].upper()}"
        if db.scalar(select(Visitor.id).where(Visitor.visitor_number == visitor_number)) is None:
            return visitor_number


def create_visitor(db: Session, student: Student, visitor_data: VisitorCreate) -> Visitor:
    visitor = Visitor(
        visitor_number=generate_visitor_number(db),
        student_id=student.id,
        visitor_name=visitor_data.visitor_name.strip(),
        visitor_phone=visitor_data.visitor_phone.strip(),
        relationship=visitor_data.relationship.strip(),
        purpose=visitor_data.purpose.strip(),
        visit_date=visitor_data.visit_date,
        expected_entry_time=visitor_data.expected_entry_time,
        expected_exit_time=visitor_data.expected_exit_time,
    )
    db.add(visitor)
    db.commit()
    db.refresh(visitor)
    return visitor


def list_my_visitors(db: Session, student_id: int) -> list[Visitor]:
    return list(db.scalars(select(Visitor).where(Visitor.student_id == student_id).order_by(Visitor.visit_date.desc(), Visitor.created_at.desc())).all())


def list_visitors(
    db: Session,
    *,
    status_filter: VisitorStatus | None = None,
    visit_date=None,
    student_id: int | None = None,
    search: str | None = None,
) -> list[Visitor]:
    query = select(Visitor).join(Student, Student.id == Visitor.student_id).order_by(Visitor.visit_date.desc(), Visitor.created_at.desc())
    if status_filter is not None:
        query = query.where(Visitor.status == status_filter)
    if visit_date is not None:
        query = query.where(Visitor.visit_date == visit_date)
    if student_id is not None:
        query = query.where(Visitor.student_id == student_id)
    if search:
        search_term = f"%{search.strip()}%"
        query = query.where(or_(Visitor.visitor_number.ilike(search_term), Visitor.visitor_name.ilike(search_term), Visitor.visitor_phone.ilike(search_term), Student.student_id.ilike(search_term), Student.full_name.ilike(search_term)))
    return list(db.scalars(query).all())


def decide_visitor(db: Session, visitor: Visitor, decision: VisitorDecision) -> Visitor:
    if visitor.status != VisitorStatus.PENDING:
        raise ValueError("Only pending visitor requests can be approved or rejected")
    visitor.status = decision.status
    db.commit()
    db.refresh(visitor)
    return visitor


def cancel_visitor(db: Session, visitor: Visitor) -> Visitor:
    if visitor.status != VisitorStatus.PENDING:
        raise ValueError("Only pending visitor requests can be cancelled")
    visitor.status = VisitorStatus.CANCELLED
    db.commit()
    db.refresh(visitor)
    return visitor


def check_in_visitor(db: Session, visitor: Visitor) -> Visitor:
    if visitor.status != VisitorStatus.APPROVED:
        raise ValueError("Only approved visitors can check in")
    visitor.status = VisitorStatus.CHECKED_IN
    visitor.check_in_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(visitor)
    return visitor


def check_out_visitor(db: Session, visitor: Visitor) -> Visitor:
    if visitor.status != VisitorStatus.CHECKED_IN:
        raise ValueError("Only checked-in visitors can check out")
    visitor.status = VisitorStatus.CHECKED_OUT
    visitor.check_out_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(visitor)
    return visitor
