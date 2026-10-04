from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_admin
from app.database.connection import get_db
from app.models.mess_feedback import MessFeedback
from app.models.student import Student
from app.models.user import User, UserRole
from app.schemas.mess_feedback import MessFeedbackCreate, MessFeedbackResponse, MessFeedbackSummary, MessFeedbackUpdate
from app.services.mess_feedback_service import create_feedback, delete_feedback, feedback_summary, get_feedback, list_feedback, update_feedback
from app.services.student_service import get_student_by_email

router = APIRouter(prefix="/api/mess-feedback", tags=["Mess Feedback"])


def get_student_for_user(db: Session, current_user: User) -> Student:
    student = get_student_by_email(db, current_user.email)
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student record not found for this account")
    return student


@router.post("", response_model=MessFeedbackResponse, status_code=status.HTTP_201_CREATED)
def create_mess_feedback(data: MessFeedbackCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> MessFeedback:
    student = get_student_for_user(db, current_user)
    return create_feedback(db, student.id, data)


@router.get("/my", response_model=list[MessFeedbackResponse])
def get_my_mess_feedback(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> list[MessFeedback]:
    student = get_student_for_user(db, current_user)
    return list_feedback(db, student_id=student.id)


@router.get("", response_model=list[MessFeedbackResponse])
def get_all_mess_feedback(db: Session = Depends(get_db), _: User = Depends(require_admin)) -> list[MessFeedback]:
    return list_feedback(db)


@router.get("/summary", response_model=MessFeedbackSummary)
def get_mess_feedback_summary(db: Session = Depends(get_db), _: User = Depends(require_admin)) -> dict:
    return feedback_summary(db)


@router.put("/{feedback_id}", response_model=MessFeedbackResponse)
def update_mess_feedback(feedback_id: int, data: MessFeedbackUpdate, db: Session = Depends(get_db), _: User = Depends(require_admin)) -> MessFeedback:
    feedback = get_feedback(db, feedback_id)
    if feedback is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mess feedback not found")
    return update_feedback(db, feedback, data)


@router.delete("/{feedback_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_mess_feedback(feedback_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> None:
    feedback = get_feedback(db, feedback_id)
    if feedback is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mess feedback not found")
    if current_user.role != UserRole.ADMIN:
        student = get_student_for_user(db, current_user)
        if feedback.student_id != student.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only delete your own feedback")
    delete_feedback(db, feedback)
