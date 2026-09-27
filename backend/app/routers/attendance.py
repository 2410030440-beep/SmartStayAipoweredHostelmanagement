from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_admin
from app.database.connection import get_db
from app.models.attendance import Attendance, AttendanceStatus
from app.models.student import Student
from app.models.user import User, UserRole
from app.schemas.attendance import (
    AttendanceCreate,
    AttendanceResponse,
    AttendanceSummaryResponse,
    AttendanceUpdate,
)
from app.services.attendance_service import (
    attendance_summary,
    create_attendance,
    get_attendance,
    get_attendance_by_student_and_date,
    list_attendance,
    update_attendance,
)
from app.services.student_service import get_student_by_email

router = APIRouter(prefix="/api/attendance", tags=["Attendance"])


def attendance_not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found")


def student_not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")


def month_range(month: str | None) -> tuple[date | None, date | None]:
    if month is None:
        return None, None
    try:
        year, month_number = (int(value) for value in month.split("-", maxsplit=1))
        start = date(year, month_number, 1)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="month must use YYYY-MM format",
        ) from error
    if month_number == 12:
        return start, date(year + 1, 1, 1)
    return start, date(year, month_number + 1, 1)


def get_existing_student(db: Session, student_id: int) -> Student:
    student = db.get(Student, student_id)
    if student is None:
        raise student_not_found()
    return student


@router.get("/my", response_model=list[AttendanceResponse])
def get_my_attendance(
    attendance_date: date | None = Query(default=None, alias="date"),
    month: str | None = Query(default=None, pattern=r"^\d{4}-(0[1-9]|1[0-2])$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Attendance]:
    student = get_student_by_email(db, current_user.email)
    if student is None:
        return []
    month_start, next_month_start = month_range(month)
    return list_attendance(
        db,
        student_id=student.id,
        attendance_date=attendance_date,
        month_start=month_start,
        next_month_start=next_month_start,
    )


@router.get("/my/summary", response_model=AttendanceSummaryResponse)
def get_my_attendance_summary(
    attendance_date: date | None = Query(default=None, alias="date"),
    month: str | None = Query(default=None, pattern=r"^\d{4}-(0[1-9]|1[0-2])$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, int | float]:
    student = get_student_by_email(db, current_user.email)
    if student is None:
        return attendance_summary([])
    month_start, next_month_start = month_range(month)
    records = list_attendance(
        db,
        student_id=student.id,
        attendance_date=attendance_date,
        month_start=month_start,
        next_month_start=next_month_start,
    )
    return attendance_summary(records)


@router.get("/summary", response_model=AttendanceSummaryResponse)
def get_attendance_summary(
    student_id: int | None = Query(default=None, gt=0),
    attendance_date: date | None = Query(default=None, alias="date"),
    month: str | None = Query(default=None, pattern=r"^\d{4}-(0[1-9]|1[0-2])$"),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> dict[str, int | float]:
    if student_id is not None:
        get_existing_student(db, student_id)
    month_start, next_month_start = month_range(month)
    records = list_attendance(
        db,
        student_id=student_id,
        attendance_date=attendance_date,
        month_start=month_start,
        next_month_start=next_month_start,
    )
    return attendance_summary(records)


@router.get("", response_model=list[AttendanceResponse])
def get_attendance_records(
    student_id: int | None = Query(default=None, gt=0),
    attendance_date: date | None = Query(default=None, alias="date"),
    attendance_status: AttendanceStatus | None = Query(default=None, alias="status"),
    month: str | None = Query(default=None, pattern=r"^\d{4}-(0[1-9]|1[0-2])$"),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[Attendance]:
    month_start, next_month_start = month_range(month)
    return list_attendance(
        db,
        student_id=student_id,
        attendance_date=attendance_date,
        status=attendance_status,
        month_start=month_start,
        next_month_start=next_month_start,
    )


@router.post("", response_model=AttendanceResponse, status_code=status.HTTP_201_CREATED)
def mark_attendance(
    attendance_data: AttendanceCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> Attendance:
    get_existing_student(db, attendance_data.student_id)
    if get_attendance_by_student_and_date(
        db, attendance_data.student_id, attendance_data.attendance_date
    ) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Attendance is already recorded for this student and date",
        )
    try:
        return create_attendance(db, attendance_data)
    except IntegrityError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Attendance is already recorded for this student and date",
        ) from error


@router.get("/{attendance_id}", response_model=AttendanceResponse)
def get_attendance_detail(
    attendance_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Attendance:
    attendance = get_attendance(db, attendance_id)
    if attendance is None:
        raise attendance_not_found()
    if current_user.role != UserRole.ADMIN:
        student = get_student_by_email(db, current_user.email)
        if student is None or attendance.student_id != student.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own attendance",
            )
    return attendance


@router.put("/{attendance_id}", response_model=AttendanceResponse)
def update_attendance_record(
    attendance_id: int,
    attendance_data: AttendanceUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> Attendance:
    attendance = get_attendance(db, attendance_id, for_update=True)
    if attendance is None:
        raise attendance_not_found()

    new_date = attendance_data.attendance_date
    if new_date is not None and new_date != attendance.attendance_date:
        existing = get_attendance_by_student_and_date(db, attendance.student_id, new_date)
        if existing is not None and existing.id != attendance.id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Attendance is already recorded for this student and date",
            )
    try:
        return update_attendance(db, attendance, attendance_data)
    except IntegrityError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Attendance update violates the student/date uniqueness rule",
        ) from error
