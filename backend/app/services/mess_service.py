from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.mess import MealType, MessFeedback, MessMenu, MessMenuStatus
from app.models.student import Student
from app.models.user import User
from app.schemas.mess import MessFeedbackCreate, MessMenuCreate, MessMenuUpdate


def get_student_for_user(db: Session, user: User) -> Student | None:
    return db.scalar(select(Student).where(Student.email == user.email.lower()))


def create_feedback(db: Session, student: Student, data: MessFeedbackCreate) -> MessFeedback:
    feedback = MessFeedback(
        student_id=student.id,
        rating=data.rating,
        feedback=data.feedback.strip(),
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback


def list_my_feedback(db: Session, student_id: int) -> list[MessFeedback]:
    return list(
        db.scalars(
            select(MessFeedback)
            .where(MessFeedback.student_id == student_id)
            .order_by(MessFeedback.created_at.desc())
        ).all()
    )


def get_menu(db: Session, menu_id: int, for_update: bool = False) -> MessMenu | None:
    query = select(MessMenu).where(MessMenu.id == menu_id)
    if for_update: query = query.with_for_update()
    return db.scalar(query)


def list_menus(db: Session, *, menu_date=None, meal_type: MealType | None = None, status: MessMenuStatus | None = None) -> list[MessMenu]:
    query = select(MessMenu).order_by(MessMenu.menu_date.desc(), MessMenu.meal_type)
    if menu_date is not None: query = query.where(MessMenu.menu_date == menu_date)
    if meal_type is not None: query = query.where(MessMenu.meal_type == meal_type)
    if status is not None: query = query.where(MessMenu.status == status)
    return list(db.scalars(query).all())


def create_menu(db: Session, admin: User, data: MessMenuCreate) -> MessMenu:
    menu = MessMenu(menu_date=data.menu_date, meal_type=data.meal_type, items=data.items.strip(), special_note=data.special_note.strip() if data.special_note else None, created_by=admin.id)
    db.add(menu)
    try: db.commit()
    except IntegrityError: db.rollback(); raise
    db.refresh(menu)
    return menu


def update_menu(db: Session, menu: MessMenu, data: MessMenuUpdate) -> MessMenu:
    if menu.status == MessMenuStatus.ARCHIVED: raise ValueError("Archived menus cannot be updated")
    updates = data.model_dump(exclude_unset=True)
    if "items" in updates:
        if not updates["items"].strip(): raise ValueError("items must not be empty")
        updates["items"] = updates["items"].strip()
    if "special_note" in updates and updates["special_note"] is not None: updates["special_note"] = updates["special_note"].strip()
    for field, value in updates.items(): setattr(menu, field, value)
    try: db.commit()
    except IntegrityError: db.rollback(); raise
    db.refresh(menu)
    return menu


def publish_menu(db: Session, menu: MessMenu) -> MessMenu:
    if menu.status != MessMenuStatus.DRAFT: raise ValueError("Only draft menus can be published")
    menu.status = MessMenuStatus.PUBLISHED
    db.commit(); db.refresh(menu); return menu


def archive_menu(db: Session, menu: MessMenu) -> MessMenu:
    if menu.status == MessMenuStatus.ARCHIVED: raise ValueError("Menu is already archived")
    menu.status = MessMenuStatus.ARCHIVED
    db.commit(); db.refresh(menu); return menu
