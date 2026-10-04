from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.mess_feedback import MessFeedback
from app.schemas.mess_feedback import MessFeedbackCreate, MessFeedbackUpdate


def list_feedback(db: Session, student_id: int | None = None) -> list[MessFeedback]:
    query = select(MessFeedback).order_by(MessFeedback.feedback_date.desc(), MessFeedback.id.desc())
    if student_id is not None:
        query = query.where(MessFeedback.student_id == student_id)
    return list(db.scalars(query).all())


def get_feedback(db: Session, feedback_id: int) -> MessFeedback | None:
    return db.get(MessFeedback, feedback_id)


def create_feedback(db: Session, student_id: int, data: MessFeedbackCreate) -> MessFeedback:
    feedback = MessFeedback(
        student_id=student_id,
        meal=data.meal,
        rating=data.rating,
        comment=data.comment.strip() if data.comment else None,
        feedback_date=data.feedback_date,
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback


def update_feedback(db: Session, feedback: MessFeedback, data: MessFeedbackUpdate) -> MessFeedback:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(feedback, field, value)
    db.commit()
    db.refresh(feedback)
    return feedback


def delete_feedback(db: Session, feedback: MessFeedback) -> None:
    db.delete(feedback)
    db.commit()


def feedback_summary(db: Session) -> dict:
    rows = db.execute(
        select(MessFeedback.rating, func.count(MessFeedback.id)).group_by(MessFeedback.rating)
    ).all()
    counts = {int(rating): int(count) for rating, count in rows}
    total = sum(counts.values())
    average = sum(rating * count for rating, count in counts.items()) / total if total else 0.0
    unreviewed = int(db.scalar(
        select(func.count(MessFeedback.id)).where(MessFeedback.reviewed.is_(False))
    ) or 0)
    return {
        "total": total,
        "average_rating": round(average, 2),
        "five_star": counts.get(5, 0),
        "four_star": counts.get(4, 0),
        "three_star": counts.get(3, 0),
        "two_star": counts.get(2, 0),
        "one_star": counts.get(1, 0),
        "unreviewed": unreviewed,
    }
