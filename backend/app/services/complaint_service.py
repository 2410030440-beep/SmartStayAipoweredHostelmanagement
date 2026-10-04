from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.complaint import Complaint, ComplaintStatus
from app.schemas.complaint import ComplaintCreate, ComplaintUpdate


def get_complaint(db: Session, complaint_id: int, for_update: bool = False) -> Complaint | None:
    query = select(Complaint).where(Complaint.id == complaint_id)
    if for_update:
        query = query.with_for_update()
    return db.scalar(query)


def list_complaints(
    db: Session,
    *,
    student_id: int | None = None,
    status: ComplaintStatus | None = None,
) -> list[Complaint]:
    query = select(Complaint).order_by(
        Complaint.created_at.desc(), Complaint.id.desc()
    )
    if student_id is not None:
        query = query.where(Complaint.student_id == student_id)
    if status is not None:
        query = query.where(Complaint.status == status)
    return list(db.scalars(query).all())


def create_complaint(db: Session, student_id: int, room_number: str | None, data: ComplaintCreate) -> Complaint:
    complaint = Complaint(
        complaint_number="PENDING",
        student_id=student_id,
        room_number=room_number,
        title=data.title.strip(),
        description=data.description.strip(),
        category=data.category,
        priority=data.priority,
        status=ComplaintStatus.OPEN,
    )
    db.add(complaint)
    db.flush()
    complaint.complaint_number = f"CMP-{complaint.id:04d}"
    db.commit()
    db.refresh(complaint)
    return complaint


def update_complaint(
    db: Session,
    complaint: Complaint,
    data: ComplaintUpdate,
) -> Complaint:
    updates = data.model_dump(exclude_unset=True)

    if "admin_note" in updates and updates["admin_note"] is not None:
        updates["admin_note"] = updates["admin_note"].strip()

    for field, value in updates.items():
        setattr(complaint, field, value)

    if complaint.status in {ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED}:
        if complaint.resolved_at is None:
            complaint.resolved_at = datetime.now(timezone.utc)
    elif complaint.status in {ComplaintStatus.OPEN, ComplaintStatus.IN_PROGRESS}:
        complaint.resolved_at = None

    db.commit()
    db.refresh(complaint)
    return complaint
