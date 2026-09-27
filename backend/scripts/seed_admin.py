import os

from pydantic import EmailStr, TypeAdapter, ValidationError
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.core.security import hash_password
from app.database.base import Base
from app.database.connection import SessionLocal, engine
from app.models import room, student, user
from app.models.user import User, UserRole


def required_setting(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise SystemExit(f"Missing required environment variable: {name}")
    return value


def main() -> None:
    email = required_setting("SMARTSTAY_ADMIN_EMAIL").lower()
    password = required_setting("SMARTSTAY_ADMIN_PASSWORD")

    try:
        email = TypeAdapter(EmailStr).validate_python(email)
    except ValidationError as error:
        raise SystemExit("SMARTSTAY_ADMIN_EMAIL must be a valid email address") from error

    if not 8 <= len(password) <= 128:
        raise SystemExit("SMARTSTAY_ADMIN_PASSWORD must be between 8 and 128 characters")

    # Register all existing models before using the same table-creation mechanism as startup.
    _ = (room, student, user)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        existing_user = db.scalar(select(User).where(User.email == email))
        if existing_user is not None:
            if existing_user.role == UserRole.ADMIN:
                print("Admin seed skipped: the admin account already exists. No changes made.")
                return

            existing_user.role = UserRole.ADMIN
            db.commit()
            print(f"Existing account promoted to ADMIN for {email}. Password unchanged.")
            return

        admin = User(
            name="SmartStay Administrator",
            email=email,
            password_hash=hash_password(password),
            role=UserRole.ADMIN,
        )
        db.add(admin)
        try:
            db.commit()
        except IntegrityError as error:
            db.rollback()
            print("Admin seed skipped: an account with that email already exists. No changes made.")
            return
        print(f"Admin account created successfully for {email}.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
