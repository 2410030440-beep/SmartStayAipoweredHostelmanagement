from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.student import Student
from app.models.user import User, UserRole
from app.schemas.user import PublicUserCreate


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email.lower()))


def create_user(db: Session, user_data: PublicUserCreate) -> User:
    email = user_data.email.lower()
    user = User(
        name=user_data.name.strip(),
        email=email,
        password_hash=hash_password(user_data.password),
        role=UserRole.STUDENT,
    )
    db.add(user)
    db.flush()

    # A student account must have a student master record so the dashboard,
    # attendance, room and future student modules can resolve the same identity.
    # If an admin has already pre-enrolled this email, reuse that Student record.
    student = db.scalar(select(Student).where(Student.email == email))
    if student is None:
        db.add(
            Student(
                student_id=f"STU-AUTO-{user.id}",
                full_name=user.name,
                email=email,
                phone="Not provided",
                course="Not specified",
                year="Not specified",
                gender="Not specified",
            )
        )

    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = get_user_by_email(db, email)
    if user is None or not verify_password(password, user.password_hash):
        return None
    return user
