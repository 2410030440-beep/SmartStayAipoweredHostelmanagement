from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.mess_feedback import MessFeedback
from app.schemas.mess_feedback import MessFeedbackCreate, MessFeedbackUpdate


def list_feedback(
    db: Session,
    *,
    student_id: int | None = None,
) -> list[MessFeedback]:
    query = select(MessFeedback).order_by(
        MessFeedback.created_at.desc(), MessFeedback.id.desc()
    )
    if student_id is not None:
        query = query.where(MessFeedback.student_id == student_id)
    return list(db.scalars(query).all())


def get_feedback(db: Session, feedback_id: int) -> MessFeedback | None:
    return db.scalar(select(MessFeedback).where(MessFeedback.id == feedback_id))


def create_feedback(
    db: Session,
    student_id: int,
    data: MessFeedbackCreate,
) -> MessFeedback:
    feedback = MessFeedback(
        student_id=student_id,
        meal=data.meal.value,
        rating=data.rating,
        feedback=data.comment.strip() if data.comment else "",
        comment=data.comment.strip() if data.comment else None,
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback


def update_feedback(
    db: Session,
    feedback: MessFeedback,
    data: MessFeedbackUpdate,
) -> MessFeedback:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(feedback, field, value)
    db.commit()
    db.refresh(feedback)
    return feedback
