from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_admin
from app.database.connection import get_db
from app.models.student import Student
from app.models.user import User, UserRole
from app.schemas.student import StudentCreate, StudentResponse, StudentUpdate
from app.services.student_service import (
    create_student,
    delete_student,
    get_student_by_email,
    get_student_by_student_id,
    list_students,
    update_student,
)

router = APIRouter(prefix="/api/students", tags=["Students"])


def student_not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")


@router.post("", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
def create_student_record(
    student_data: StudentCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> Student:
    if get_student_by_student_id(db, student_data.student_id) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Student ID already exists")
    if get_student_by_email(db, student_data.email) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Student email already exists")

    try:
        return create_student(db, student_data)
    except IntegrityError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Student ID or email already exists",
        ) from error


@router.get("", response_model=list[StudentResponse])
def get_students(
    search: str | None = Query(default=None, max_length=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Student]:
    if current_user.role == UserRole.ADMIN:
        return list_students(db, search)

    student = get_student_by_email(db, current_user.email)
    if student is None:
        return []
    search_term = search.strip().lower() if search else ""
    student_values = (student.student_id, student.full_name, student.email, student.course)
    if search_term and not any(search_term in value.lower() for value in student_values):
        return []
    return [student]



@router.get("/profile", response_model=StudentResponse)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Student:
    student = get_student_by_email(db, current_user.email)
    if student is None:
        raise student_not_found()
    return student


@router.put("/profile", response_model=StudentResponse)
def update_my_profile(
    student_data: StudentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Student:
    student = get_student_by_email(db, current_user.email)
    if student is None:
        raise student_not_found()

    updates = student_data.model_dump(exclude_unset=True)
    allowed_fields = {"full_name", "phone", "course", "year", "gender"}
    safe_updates = {key: value for key, value in updates.items() if key in allowed_fields}

    try:
        return update_student(db, student, StudentUpdate(**safe_updates))
    except IntegrityError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Profile update conflicts with existing data") from error


@router.get("/{student_id}", response_model=StudentResponse)
def get_student(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Student:
    student = get_student_by_student_id(db, student_id)
    if student is None:
        raise student_not_found()
    if current_user.role != UserRole.ADMIN and student.email != current_user.email:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only view your own student record")
    return student


@router.put("/{student_id}", response_model=StudentResponse)
def update_student_record(
    student_id: str,
    student_data: StudentUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> Student:
    student = get_student_by_student_id(db, student_id)
    if student is None:
        raise student_not_found()
    if student_data.email and student_data.email.lower() != student.email:
        existing = get_student_by_email(db, student_data.email)
        if existing is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Student email already exists")

    try:
        return update_student(db, student, student_data)
    except IntegrityError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Student email already exists") from error


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student_record(
    student_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> None:
    student = get_student_by_student_id(db, student_id)
    if student is None:
        raise student_not_found()
    delete_student(db, student)
