from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.complaint import Complaint, ComplaintCategory, ComplaintPriority, ComplaintStatus
from app.models.student import Student
from app.models.user import User
from app.schemas.complaint import ComplaintCreate, ComplaintUpdate


def get_student_for_user(db: Session, user: User) -> Student | None:
    return db.scalar(select(Student).where(Student.email == user.email.lower()))


def get_complaint(db: Session, complaint_id: int, for_update: bool = False) -> Complaint | None:
    query = select(Complaint).where(Complaint.id == complaint_id)
    if for_update: query = query.with_for_update()
    return db.scalar(query)


def complaint_number(db: Session) -> str:
    while True:
        value = f"CMP-{uuid4().hex[:12].upper()}"
        if db.scalar(select(Complaint.id).where(Complaint.complaint_number == value)) is None:
            return value


def create_complaint(db: Session, student: Student, data: ComplaintCreate) -> Complaint:
    complaint = Complaint(complaint_number=complaint_number(db), student_id=student.id, room_number=student.room_number, title=data.title.strip(), description=data.description.strip(), category=data.category, priority=data.priority)
    db.add(complaint)
    db.commit()
    db.refresh(complaint)
    return complaint


def list_my_complaints(db: Session, student_id: int) -> list[Complaint]:
    return list(db.scalars(select(Complaint).where(Complaint.student_id == student_id).order_by(Complaint.created_at.desc())).all())


def list_complaints(db: Session, *, status=None, category=None, priority=None, room_number=None, student_id=None, search=None) -> list[Complaint]:
    query = select(Complaint).join(Student, Student.id == Complaint.student_id).order_by(Complaint.created_at.desc())
    if status is not None: query = query.where(Complaint.status == status)
    if category is not None: query = query.where(Complaint.category == category)
    if priority is not None: query = query.where(Complaint.priority == priority)
    if room_number: query = query.where(Complaint.room_number == room_number)
    if student_id is not None: query = query.where(Complaint.student_id == student_id)
    if search:
        term = f"%{search.strip()}%"
        query = query.where(or_(Complaint.complaint_number.ilike(term), Complaint.title.ilike(term), Complaint.description.ilike(term), Student.student_id.ilike(term), Student.full_name.ilike(term)))
    return list(db.scalars(query).all())


def update_complaint(db: Session, complaint: Complaint, data: ComplaintUpdate) -> Complaint:
    updates = data.model_dump(exclude_unset=True)
    if "status" in updates and updates["status"] != complaint.status:
        allowed = {
            ComplaintStatus.OPEN: {ComplaintStatus.IN_PROGRESS},
            ComplaintStatus.IN_PROGRESS: {ComplaintStatus.OPEN, ComplaintStatus.RESOLVED},
            ComplaintStatus.RESOLVED: {ComplaintStatus.IN_PROGRESS, ComplaintStatus.CLOSED},
            ComplaintStatus.CLOSED: set(),
        }
        if updates["status"] not in allowed[complaint.status]:
            raise ValueError(f"Cannot transition complaint from {complaint.status.value} to {updates['status'].value}")
        if updates["status"] == ComplaintStatus.RESOLVED:
            complaint.resolved_at = datetime.now(timezone.utc)
        elif complaint.status == ComplaintStatus.RESOLVED:
            complaint.resolved_at = None
    if "admin_note" in updates and updates["admin_note"] is not None:
        updates["admin_note"] = updates["admin_note"].strip()
    for field, value in updates.items(): setattr(complaint, field, value)
    db.commit()
    db.refresh(complaint)
    return complaint


def delete_complaint(db: Session, complaint: Complaint) -> None:
    db.delete(complaint)
    db.commit()
