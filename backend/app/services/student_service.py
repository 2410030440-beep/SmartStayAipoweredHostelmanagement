from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.student import Student
from app.schemas.student import StudentCreate, StudentUpdate


def get_student_by_student_id(db: Session, student_id: str) -> Student | None:
    return db.scalar(select(Student).where(Student.student_id == student_id))


def get_student_by_email(db: Session, email: str) -> Student | None:
    return db.scalar(select(Student).where(Student.email == email.lower()))


def list_students(db: Session, search: str | None = None) -> list[Student]:
    query = select(Student).order_by(Student.created_at.desc())
    if search:
        search_term = f"%{search.strip()}%"
        query = query.where(
            or_(
                Student.student_id.ilike(search_term),
                Student.full_name.ilike(search_term),
                Student.email.ilike(search_term),
                Student.course.ilike(search_term),
            )
        )
    return list(db.scalars(query).all())


def create_student(db: Session, student_data: StudentCreate) -> Student:
    student = Student(
        student_id=student_data.student_id.strip(),
        full_name=student_data.full_name.strip(),
        email=student_data.email.lower(),
        phone=student_data.phone.strip(),
        course=student_data.course.strip(),
        year=student_data.year.strip(),
        gender=student_data.gender.strip(),
        room_number=student_data.room_number.strip() if student_data.room_number else None,
        status=student_data.status,
    )
    db.add(student)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise
    db.refresh(student)
    return student


def update_student(db: Session, student: Student, student_data: StudentUpdate) -> Student:
    updates = student_data.model_dump(exclude_unset=True)
    if "email" in updates and updates["email"] is not None:
        updates["email"] = updates["email"].lower()
    for field in ("full_name", "phone", "course", "year", "gender", "room_number"):
        if field in updates and updates[field] is not None:
            updates[field] = updates[field].strip()
    for field, value in updates.items():
        setattr(student, field, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise
    db.refresh(student)
    return student


def delete_student(db: Session, student: Student) -> None:
    db.delete(student)
    db.commit()
