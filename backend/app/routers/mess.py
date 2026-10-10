from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_admin
from app.database.connection import get_db
from app.models.mess import MealType, MessFeedback, MessMenu, MessMenuStatus
from app.models.student import Student
from app.models.user import User, UserRole
from app.schemas.mess import MessFeedbackCreate, MessFeedbackResponse, MessMenuCreate, MessMenuResponse, MessMenuUpdate
from app.services.mess_service import (
    archive_menu,
    create_feedback,
    create_menu,
    get_student_for_user,
    get_menu,
    list_my_feedback,
    list_menus,
    publish_menu,
    update_menu,
)

router = APIRouter(prefix="/api/mess", tags=["Mess"])


def menu_not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mess menu not found")


def require_student_record(db: Session, user: User) -> Student:
    if user.role != UserRole.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student access is required")
    student = get_student_for_user(db, user)
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student record not found")
    return student


@router.post("/feedback", response_model=MessFeedbackResponse, status_code=status.HTTP_201_CREATED)
def create_mess_feedback(
    feedback_data: MessFeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessFeedback:
    return create_feedback(db, require_student_record(db, current_user), feedback_data)


@router.get("/feedback/my", response_model=list[MessFeedbackResponse])
def get_my_mess_feedback(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[MessFeedback]:
    student = require_student_record(db, current_user)
    return list_my_feedback(db, student.id)


@router.post("", response_model=MessMenuResponse, status_code=status.HTTP_201_CREATED)
def create_mess_menu(
    menu_data: MessMenuCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> MessMenu:
    try:
        return create_menu(db, current_user, menu_data)
    except IntegrityError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A menu for this date and meal type already exists",
        ) from error


@router.get("", response_model=list[MessMenuResponse])
def get_mess_menus(
    menu_date: date | None = None,
    meal_type: MealType | None = None,
    status_filter: MessMenuStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[MessMenu]:
    effective_status = status_filter
    if current_user.role == UserRole.STUDENT:
        effective_status = MessMenuStatus.PUBLISHED
    return list_menus(db, menu_date=menu_date, meal_type=meal_type, status=effective_status)


@router.get("/{menu_id}", response_model=MessMenuResponse)
def get_mess_menu_detail(
    menu_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessMenu:
    menu = get_menu(db, menu_id)
    if menu is None:
        raise menu_not_found()
    if current_user.role == UserRole.STUDENT and menu.status != MessMenuStatus.PUBLISHED:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only view published mess menus")
    return menu


@router.patch("/{menu_id}", response_model=MessMenuResponse)
def update_mess_menu_record(
    menu_id: int,
    update_data: MessMenuUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> MessMenu:
    menu = get_menu(db, menu_id, for_update=True)
    if menu is None:
        raise menu_not_found()
    try:
        return update_menu(db, menu, update_data)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error
    except IntegrityError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A menu for this date and meal type already exists",
        ) from error


@router.post("/{menu_id}/publish", response_model=MessMenuResponse)
def publish_mess_menu(
    menu_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> MessMenu:
    menu = get_menu(db, menu_id, for_update=True)
    if menu is None:
        raise menu_not_found()
    try:
        return publish_menu(db, menu)
    except ValueError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error


@router.post("/{menu_id}/archive", response_model=MessMenuResponse)
def archive_mess_menu(
    menu_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> MessMenu:
    menu = get_menu(db, menu_id, for_update=True)
    if menu is None:
        raise menu_not_found()
    try:
        return archive_menu(db, menu)
    except ValueError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error

