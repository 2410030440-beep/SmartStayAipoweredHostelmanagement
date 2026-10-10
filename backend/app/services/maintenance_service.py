from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.maintenance import MaintenanceCategory, MaintenancePriority, MaintenanceStatus, MaintenanceTicket
from app.models.student import Student
from app.models.user import User
from app.schemas.maintenance import MaintenanceCreate, MaintenanceUpdate


def get_student_for_user(db: Session, user: User) -> Student | None:
    return db.scalar(select(Student).where(Student.email == user.email.lower()))


def get_ticket(db: Session, ticket_id: int, for_update: bool = False) -> MaintenanceTicket | None:
    query = select(MaintenanceTicket).where(MaintenanceTicket.id == ticket_id)
    if for_update:
        query = query.with_for_update()
    return db.scalar(query)


def ticket_number(db: Session) -> str:
    while True:
        value = f"MT-{uuid4().hex[:12].upper()}"
        if db.scalar(select(MaintenanceTicket.id).where(MaintenanceTicket.ticket_number == value)) is None:
            return value


def create_ticket(db: Session, student: Student, data: MaintenanceCreate) -> MaintenanceTicket:
    ticket = MaintenanceTicket(ticket_number=ticket_number(db), student_id=student.id, room_number=student.room_number, title=data.title.strip(), description=data.description.strip(), category=data.category, priority=data.priority)
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


def list_my_tickets(db: Session, student_id: int) -> list[MaintenanceTicket]:
    return list(db.scalars(select(MaintenanceTicket).where(MaintenanceTicket.student_id == student_id).order_by(MaintenanceTicket.created_at.desc())).all())


def list_tickets(db: Session, *, status=None, category=None, priority=None, room_number=None, student_id=None, search=None) -> list[MaintenanceTicket]:
    query = select(MaintenanceTicket).join(Student, Student.id == MaintenanceTicket.student_id).order_by(MaintenanceTicket.created_at.desc())
    if status is not None: query = query.where(MaintenanceTicket.status == status)
    if category is not None: query = query.where(MaintenanceTicket.category == category)
    if priority is not None: query = query.where(MaintenanceTicket.priority == priority)
    if room_number: query = query.where(MaintenanceTicket.room_number == room_number)
    if student_id is not None: query = query.where(MaintenanceTicket.student_id == student_id)
    if search:
        term = f"%{search.strip()}%"
        query = query.where(or_(MaintenanceTicket.ticket_number.ilike(term), MaintenanceTicket.title.ilike(term), MaintenanceTicket.description.ilike(term), Student.student_id.ilike(term), Student.full_name.ilike(term)))
    return list(db.scalars(query).all())


def update_ticket(db: Session, ticket: MaintenanceTicket, data: MaintenanceUpdate) -> MaintenanceTicket:
    updates = data.model_dump(exclude_unset=True)
    if "status" in updates and updates["status"] != ticket.status:
        allowed = {
            MaintenanceStatus.OPEN: {MaintenanceStatus.IN_PROGRESS},
            MaintenanceStatus.IN_PROGRESS: {MaintenanceStatus.OPEN, MaintenanceStatus.RESOLVED},
            MaintenanceStatus.RESOLVED: {MaintenanceStatus.IN_PROGRESS, MaintenanceStatus.CLOSED},
            MaintenanceStatus.CLOSED: set(),
        }
        if updates["status"] not in allowed[ticket.status]:
            raise ValueError(f"Cannot transition maintenance ticket from {ticket.status.value} to {updates['status'].value}")
        if updates["status"] == MaintenanceStatus.RESOLVED:
            ticket.resolved_at = datetime.now(timezone.utc)
        elif ticket.status == MaintenanceStatus.RESOLVED:
            ticket.resolved_at = None
    if "admin_note" in updates and updates["admin_note"] is not None:
        updates["admin_note"] = updates["admin_note"].strip()
    for field, value in updates.items(): setattr(ticket, field, value)
    db.commit()
    db.refresh(ticket)
    return ticket
